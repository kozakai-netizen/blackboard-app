import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE;
const DW_BEARER_TOKEN = process.env.DW_BEARER_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeCode = searchParams.get('place_code') || 'dandoli-sample1';

    console.log('🔄 Starting user sync...', { placeCode });

    // ダンドリワークAPIからユーザー情報を取得
    const response = await fetch(`${DW_API_BASE}/users?place_code=${placeCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DW_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DandoriWork API error: ${response.status}`);
    }

    const data = await response.json();
    const users = data.data || [];

    console.log(`📥 Fetched ${users.length} users from DandoriWork API`);

    // Supabaseクライアント作成（サービスロールキー使用）
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let insertCount = 0;
    let updateCount = 0;
    let errorCount = 0;

    // ユーザーデータを1件ずつ処理
    for (const user of users) {
      try {
        const userData = {
          user_id: String(user.id || user.user_id),
          name: user.name || '',
          phone: user.phone || user.tel || null,
          email: user.email || null,
          level: user.level || null,
          permission: user.permission || user.role || null,
          industry: user.industry || user.business_type || null,
          company_id: String(user.company_id || ''),
          company_name: user.company_name || user.company?.name || null,
          office: user.office || user.branch || null,
          code: user.code || null,
          last_login: user.last_login ? new Date(user.last_login) : null,
          updated_at: new Date(),
        };

        // UPSERT（存在すれば更新、なければ挿入）
        const { data: result, error } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'user_id',
          })
          .select();

        if (error) {
          console.error('❌ Error upserting user:', user.id, error);
          errorCount++;
        } else {
          // 新規挿入か更新かを判定（完全な判定は難しいので、便宜的にカウント）
          insertCount++;
        }
      } catch (error) {
        console.error('❌ Error processing user:', user.id, error);
        errorCount++;
      }
    }

    console.log('✅ User sync completed:', {
      total: users.length,
      insertCount,
      updateCount,
      errorCount,
    });

    return NextResponse.json({
      success: true,
      message: 'User sync completed',
      stats: {
        total: users.length,
        processed: insertCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('❌ User sync failed:', error);
    return NextResponse.json(
      { error: 'User sync failed', details: String(error) },
      { status: 500 }
    );
  }
}
