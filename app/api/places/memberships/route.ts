import { NextResponse } from 'next/server';

/**
 * GET /api/places/memberships
 * ユーザーが属するplace_code[]を返す
 *
 * TODO: 本来はDBのuser_place_membershipsテーブルから取得すべきだが、
 * 現状は暫定でDW APIから取得（または固定値）
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '40824';

    // 暫定実装: 固定でdandoli-sample1を返す
    // 本来はDW API /co/places などから取得するか、DBに登録されたmembershipsを参照
    const memberships = [
      { place_code: 'dandoli-sample1', place_name: 'サンプル工務店1' },
      // { place_code: 'dandoli-sample2', place_name: 'サンプル工務店2' },
    ];

    console.log(`[places/memberships] userId=${userId}, memberships:`, memberships.length);

    return NextResponse.json({
      ok: true,
      memberships,
    });
  } catch (error: any) {
    console.error('[places/memberships] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
