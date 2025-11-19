// シンプルなログインAPI
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getRoleForPlace } from '@/lib/auth/getRoleForPlace';

// テスト用のユーザー情報（.env.localから読み込む想定だが、ハードコードも可）
const TEST_USERS = [
  {
    username: 'kozakai@dandoli-works.com',
    password: '00000507',
    userId: 40824,
    displayName: '小坂井 優（元請け）',
  },
  {
    username: 'dan',
    password: '00000507',
    userId: 40364,
    displayName: '小坂井職人（協力業者）',
  },
];

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    console.log(`[simple-login] ログイン試行: username=${username}`);

    // ユーザー認証
    const user = TEST_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      console.log(`[simple-login] ❌ 認証失敗: username=${username}`);
      return NextResponse.json(
        { ok: false, error: 'invalid_credentials', message: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // ロール判定
    const placeId = 170; // dandoli-sample1
    let userRole: 'prime' | 'sub' | 'unknown' = 'unknown';

    try {
      userRole = await getRoleForPlace(user.userId, placeId);
      console.log(`[simple-login] ロール判定: userId=${user.userId}, userRole=${userRole}`);
    } catch (error: any) {
      console.error(`[simple-login] ❌ ロール判定エラー:`, error.message);
    }

    // セッションに保存
    const session = await getSession();
    session.userId = user.userId;
    session.username = user.username;
    session.userRole = userRole;
    session.placeId = placeId;
    session.isLoggedIn = true;
    await session.save();

    console.log(`[simple-login] ✅ ログイン成功: userId=${user.userId}, userRole=${userRole}`);

    return NextResponse.json({
      ok: true,
      user: {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        userRole,
        placeId,
      },
    });
  } catch (error: any) {
    console.error('[simple-login] ❌ エラー:', error.message);
    return NextResponse.json(
      { ok: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
