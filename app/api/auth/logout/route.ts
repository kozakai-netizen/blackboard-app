// ログアウトAPI
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();

    console.log('[logout] ✅ ログアウト成功');

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[logout] ❌ エラー:', error.message);
    return NextResponse.json(
      { ok: false, error: 'server_error' },
      { status: 500 }
    );
  }
}
