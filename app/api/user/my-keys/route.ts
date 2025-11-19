import { NextResponse } from 'next/server';
import { getMyKeys } from '@/lib/user/keyResolver';

/** 8桁ゼロ埋め */
const pad8 = (s?: string): string | undefined => {
  if (!s) return undefined;
  return /^\d+$/.test(s) ? s.padStart(8, '0') : s;
};

/**
 * GET /api/user/my-keys?uid=<uid>&place=<code>&emp=<empcode>
 * 現在のユーザーのキー情報を取得（プレイス必須、社員コード含む）
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = (searchParams.get('uid') || '').trim() || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '40824';
    const place = (searchParams.get('place') || '').trim() || 'dandoli-sample1';
    const empParam = (searchParams.get('emp') || '').trim();

    // 入力ログ
    console.info('[my-keys] input', { uid, place, emp: empParam });

    // 既存のキー解決（id/username取得）★1回だけ呼び出す
    const base = await getMyKeys(uid, place);

    let emp = empParam; // ① URLパラメータ最優先
    let via = 'query';

    // empが空の場合はDW API自動ルックアップ
    if (!emp) {
      const username = base?.username;

      if (username) {
        // DW APIトークンチェック
        if (!process.env.DW_BEARER_TOKEN) {
          console.warn('[my-keys] DW_BEARER_TOKEN not configured, skipping auto-lookup');
          via = 'no-token';
        } else {
          // DW API user-lookupを呼び出し
          try {
            const lookupUrl = `/api/dandori/user-lookup?place=${encodeURIComponent(place)}&username=${encodeURIComponent(username)}`;

            console.info('[my-keys] calling user-lookup', { place, username });

            // 本番/開発環境両対応
            const apiBase = process.env.NEXT_PUBLIC_BASE_PATH
              ? process.env.NEXT_PUBLIC_BASE_PATH
              : (typeof window === 'undefined' ? `http://localhost:${process.env.PORT || 3001}` : '');

            const lookupRes = await fetch(
              `${apiBase}${lookupUrl}`,
              { cache: 'no-store' }
            );
            const lookupData = await lookupRes.json();

            if (lookupData.ok && lookupData.employee_code) {
              emp = String(lookupData.employee_code).trim();
              via = 'dw-user-lookup';
              console.info('[my-keys] resolved via DW', {
                place,
                uid,
                username,
                emp
              });
            } else {
              console.warn('[my-keys] emp not found via DW', { place, uid, username, error: lookupData.error });
              via = 'dw-not-found';
            }
          } catch (lookupError) {
            console.error('[my-keys] DW lookup failed', lookupError);
            via = 'dw-error';
          }
        }
      } else {
        console.warn('[my-keys] username not found in DB', { uid, place });
        via = 'no-username';
      }
    }

    // 社員コードのバリアント（生値 + 8桁ゼロ詰め）
    const empVariants = emp
      ? Array.from(new Set([emp, pad8(emp)].filter(Boolean)))
      : [];

    // employee_codeとempSetをマージしてallに統合
    const all = Array.from(new Set([
      String(uid),
      base?.username,
      ...empVariants
    ].filter(Boolean)));

    // ★employee_codeを明示的に設定
    const keys = {
      id: String(uid),
      username: base?.username,
      employee_code: emp || undefined,
      all
    };

    // 出力ログ（viaフィールド追加）
    console.info('[my-keys] output', { place, via, keysAll: keys.all, employee_code: keys.employee_code });

    // employee_codeが空なら警告を含める
    if (!keys.employee_code) {
      return NextResponse.json({
        ok: true,
        place,
        keys,
        via,
        reason: 'missing_employee_code',
        warning: 'このプレイスであなたの社員コードが見つかりません。管理者に連絡してください。',
      });
    }

    return NextResponse.json({
      ok: true,
      place,
      keys,
      via,
    });
  } catch (error: any) {
    console.error('[api/user/my-keys] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
