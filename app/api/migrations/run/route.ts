import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { sql } = await request.json();

    if (!sql) {
      return NextResponse.json(
        { error: 'SQL is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Executing SQL migration...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration error:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log('✅ Migration executed successfully');

    return NextResponse.json({
      success: true,
      message: 'Migration executed successfully',
      data
    });
  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      { error: 'Failed to execute migration' },
      { status: 500 }
    );
  }
}
