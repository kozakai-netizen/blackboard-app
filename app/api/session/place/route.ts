import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/session/place
 * プレイスを選択してセッションに保存
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { place_code } = body;

    if (!place_code) {
      return NextResponse.json(
        { ok: false, error: 'place_code is required' },
        { status: 400 }
      );
    }

    // TODO: memberships APIで検証（現状は暫定で許可）
    // const memberships = await getMemberships(userId);
    // if (!memberships.includes(place_code)) {
    //   return NextResponse.json({ ok: false, error: 'invalid place_code' }, { status: 403 });
    // }

    // Cookieに保存
    const cookieStore = await cookies();
    cookieStore.set('selectedPlace', place_code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    });

    return NextResponse.json({
      ok: true,
      place_code,
    });
  } catch (error: any) {
    console.error('[session/place] Error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
