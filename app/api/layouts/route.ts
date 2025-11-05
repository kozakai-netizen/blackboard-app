// app/api/layouts/route.ts
// レイアウト一覧取得API

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Layout } from '@/types/layouts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * レイアウト一覧取得
 * GET /api/layouts
 * Query params:
 *   - system_only: true でシステム標準のみ
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemOnly = searchParams.get('system_only') === 'true';

    let query = supabase
      .from('layouts')
      .select('*')
      .order('display_order', { ascending: true });

    if (systemOnly) {
      query = query.eq('is_system', true);
    }

    const { data, error } = await query.returns<Layout[]>();

    if (error) {
      console.error('Failed to fetch layouts:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * レイアウト使用回数更新
 * POST /api/layouts/[id]/increment
 */
export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    const { error } = await supabase.rpc('increment_layout_usage', {
      layout_id: id
    });

    if (error) {
      console.error('Failed to increment usage:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
