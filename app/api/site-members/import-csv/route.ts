import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as iconv from 'iconv-lite';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📂 Importing site members CSV:', file.name);

    // Shift-JISで読み込み
    const buffer = await file.arrayBuffer();
    const text = iconv.decode(Buffer.from(buffer), 'Shift_JIS');
    const lines = text.split('\n').filter(line => line.trim());

    console.log(`📊 Total lines: ${lines.length}`);

    // ヘッダー行をスキップ
    const header = lines[0].split(',');
    console.log('📋 Headers:', header);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));

        // CSVカラム:
        // 0: 現場ID, 1: 現場名, 2: 会社ID, 3: 会社名,
        // 4: ユーザーID, 5: ユーザー名, 6: 参加レベル

        const siteMemberData = {
          site_code: values[0],
          site_name: values[1],
          company_id: values[2],
          company_name: values[3],
          user_id: values[4],
          user_name: values[5],
          participation_level: parseInt(values[6]) || 3,
          updated_at: new Date().toISOString()
        };

        // site_code, user_idでUPSERT
        const { error } = await supabase
          .from('site_members')
          .upsert(siteMemberData, {
            onConflict: 'site_code,user_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Error importing line ${i}:`, error);
          errors++;
        } else {
          imported++;
        }
      } catch (error) {
        console.error(`❌ Error parsing line ${i}:`, error);
        errors++;
      }
    }

    console.log(`✅ Import completed: ${imported} imported, ${errors} errors`);

    return NextResponse.json({
      success: true,
      imported,
      errors,
      message: `Imported ${imported} site members`
    });

  } catch (error) {
    console.error('❌ CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
