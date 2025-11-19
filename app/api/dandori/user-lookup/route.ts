import { NextResponse } from 'next/server';
import { getDwToken } from '@/lib/dw/token';

/**
 * GET /api/dandori/user-lookup?place=<place>&username=<username>
 * DWユーザー照会：usernameから社員コードを自動取得
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const place = (searchParams.get('place') || '').trim();
  const username = (searchParams.get('username') || '').trim();

  if (!place || !username) {
    return NextResponse.json(
      { ok: false, error: 'place/username required' },
      { status: 400 }
    );
  }

  try {
    const { token, source } = getDwToken(place);
    if (!token) {
      console.info('[user-lookup] no token', { place, source });
      return NextResponse.json({ ok: false, reason: 'no-token' }, { status: 200 });
    }

    // DW APIのユーザー一覧エンドポイント（place配下のユーザー）
    const apiBase = process.env.NEXT_PUBLIC_DW_API_BASE || 'https://api.dandoli.jp/api';
    const url = `${apiBase}/co/places/${place}/users`;

    console.info('[user-lookup] Fetching DW users', { place, username, tokenSource: source });

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('[user-lookup] DW API error', { status: res.status });
      return NextResponse.json(
        { ok: false, error: `DW ${res.status}` },
        { status: 200 }
      );
    }

    const data = await res.json();

    // DW APIのレスポンス形式に合わせて調整
    // 想定: { data: [ { user_code, username, mail, employee_code, ... } ] }
    const users = Array.isArray(data?.data) ? data.data : [];

    console.info('[user-lookup] Found users', { count: users.length });

    // usernameまたはmailで照合
    const hit = users.find((u: any) => {
      const uname = (u.username || '').trim().toLowerCase();
      const mail = (u.mail || '').trim().toLowerCase();
      const loginId = (u.login_id || '').trim().toLowerCase();
      const target = username.toLowerCase();

      return uname === target || mail === target || loginId === target;
    });

    if (hit?.employee_code) {
      const empCode = String(hit.employee_code).trim();
      console.info('[user-lookup] Found employee_code', {
        username,
        employee_code: empCode,
        user_code: hit.user_code
      });

      return NextResponse.json({
        ok: true,
        employee_code: empCode,
        raw: {
          user_code: hit.user_code,
          username: hit.username
        }
      });
    }

    console.warn('[user-lookup] employee_code not found', { username, place });
    return NextResponse.json({ ok: false, error: 'not_found' });

  } catch (e: any) {
    console.error('[user-lookup] Error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'dw_error' },
      { status: 200 }
    );
  }
}
