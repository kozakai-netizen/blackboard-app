import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { username, password, userType } = await request.json();

    console.log('🔐 Login attempt:', { username, userType });

    // 簡易認証（本番環境では適切な認証システムを使用してください）
    // TODO: ダンドリワークAPIでの認証に置き換え

    // Supabaseからユーザー情報を取得
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      console.warn('⚠️ User not found:', username);
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const user = users[0];

    // パスワードチェック（簡易版 - 本番環境では暗号化したパスワードを比較）
    // TODO: 本番環境ではハッシュ化されたパスワードを比較
    // 今回は簡易実装のためスキップ

    console.log('✅ Login successful:', {
      user_id: user.user_id,
      name: user.name,
      userType
    });

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        company_name: user.company_name,
        permission: user.permission,
        level: user.level
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理でエラーが発生しました' },
      { status: 500 }
    );
  }
}
