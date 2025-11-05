import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { username, password, userType } = await request.json()

    // usersテーブルからユーザー情報を取得
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', username)
      .limit(1)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const user = users[0]

    // 簡易的なパスワードチェック（実際の環境ではハッシュ化を使用）
    // ここでは開発用に単純な比較
    if (password !== '00000507') {
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      )
    }

    // ログイン成功
    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        company_name: user.company_name,
        level: user.level,
        permission: user.permission
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'ログイン処理でエラーが発生しました' },
      { status: 500 }
    )
  }
}
