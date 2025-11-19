// セッション情報取得API
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({
        ok: false,
        isLoggedIn: false,
      });
    }

    return NextResponse.json({
      ok: true,
      isLoggedIn: true,
      user: {
        userId: session.userId,
        username: session.username,
        userRole: session.userRole,
        placeId: session.placeId,
      },
    });
  } catch (error: any) {
    console.error('[session] ❌ エラー:', error.message);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
