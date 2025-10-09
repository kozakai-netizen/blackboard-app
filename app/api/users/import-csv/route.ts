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
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    console.log('📥 Importing CSV file:', file.name);

    // CSVを読み込み（Shift-JISからUTF-8に変換）
    const buffer = await file.arrayBuffer();
    const text = iconv.decode(Buffer.from(buffer), 'Shift_JIS');
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSVファイルが空です' }, { status: 400 });
    }

    // ヘッダー行を解析
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('📋 CSV Headers:', headers);

    // Supabaseクライアント作成
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let insertCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // データ行を処理
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');

      if (values.length < headers.length) {
        console.warn(`⚠️ Skipping line ${i + 1}: insufficient columns`);
        continue;
      }

      try {
        // CSVの列名からデータを抽出
        const userId = values[0]?.trim(); // ユーザーID
        const name = values[1]?.trim(); // 氏名
        const phone = values[2]?.trim(); // 電話番号
        const email = values[3]?.trim(); // メールアドレス
        const level = values[4]?.trim(); // レベル
        const permission = values[5]?.trim(); // 権限
        const industry = values[6]?.trim(); // 業種
        const companyId = values[7]?.trim(); // 会社ID
        const companyName = values[8]?.trim(); // 会社名
        const office = values[9]?.trim(); // 営業所
        const code = values[10]?.trim(); // コード
        const lastLogin = values[11]?.trim(); // 最終ログイン時間

        if (!userId || !name) {
          console.warn(`⚠️ Skipping line ${i + 1}: missing required fields`);
          continue;
        }

        const userData = {
          user_id: userId,
          name: name,
          phone: phone || null,
          email: email || null,
          level: level || null,
          permission: permission || null,
          industry: industry || null,
          company_id: companyId || null,
          company_name: companyName || null,
          office: office || null,
          code: code || null,
          last_login: lastLogin && lastLogin !== '' ? new Date(lastLogin) : null,
          updated_at: new Date(),
        };

        // UPSERT
        const { error } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'user_id',
          });

        if (error) {
          console.error(`❌ Error importing line ${i + 1}:`, error);
          errorCount++;
          errors.push(`Line ${i + 1}: ${error.message}`);
        } else {
          insertCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing line ${i + 1}:`, error);
        errorCount++;
        errors.push(`Line ${i + 1}: ${String(error)}`);
      }
    }

    console.log('✅ CSV import completed:', {
      total: lines.length - 1,
      imported: insertCount,
      errors: errorCount,
    });

    return NextResponse.json({
      success: true,
      message: 'CSVインポート完了',
      stats: {
        total: lines.length - 1,
        imported: insertCount,
        errors: errorCount,
      },
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined, // 最初の10件のみ
    });
  } catch (error) {
    console.error('❌ CSV import failed:', error);
    return NextResponse.json(
      { error: 'CSVインポート失敗', details: String(error) },
      { status: 500 }
    );
  }
}
