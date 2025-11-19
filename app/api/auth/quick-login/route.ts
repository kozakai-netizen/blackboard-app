import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { userId, placeId } = await req.json();

    if (!userId || !placeId) {
      return NextResponse.json(
        { ok: false, message: 'userId と placeId が必要です' },
        { status: 400 }
      );
    }

    // セッションを取得
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);

    // セッションにユーザー情報を保存
    session.userId = userId;
    session.placeId = placeId;
    session.placeCode = 'dandoli-sample1'; // デフォルトのplace_code
    session.isLoggedIn = true;

    await session.save();

    console.log('✅ クイックログイン成功:', { userId, placeId });

    return NextResponse.json({
      ok: true,
      user: {
        userId,
        placeId,
        placeCode: 'dandoli-sample1',
      },
    });
  } catch (error: any) {
    console.error('❌ クイックログインエラー:', error);
    return NextResponse.json(
      { ok: false, message: 'ログイン処理に失敗しました' },
      { status: 500 }
    );
  }
}
