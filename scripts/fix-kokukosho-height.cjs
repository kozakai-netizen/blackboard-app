// scripts/fix-kokukosho-height.cjs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixHeight() {
  console.log('🔧 国交省標準黒板の高さを修正します...\n');

  // 現在の設定を取得
  const { data: current, error: fetchError } = await supabase
    .from('templates')
    .select('id, name, design_settings, fields')
    .ilike('name', '%国交省%')
    .limit(1)
    .single();

  if (fetchError) {
    console.error('❌ テンプレート取得エラー:', fetchError);
    return;
  }

  console.log('📋 現在の設定:');
  console.log('  幅:', current.design_settings.width + '%');
  console.log('  高さ:', current.design_settings.height + '%');
  console.log('  位置: Y=' + current.design_settings.position.y + '%');
  console.log('  フィールド数:', current.fields.length);

  // 新しい設定
  const newSettings = {
    ...current.design_settings,
    height: 28,  // 22% → 28% (備考を含めて全項目が収まる高さ)
    position: {
      x: 2,      // 左端から2%の余白
      y: 67      // 72% → 67% (少し上に移動してはみ出し防止)
    }
  };

  console.log('\n✨ 新しい設定:');
  console.log('  幅:', newSettings.width + '%');
  console.log('  高さ:', newSettings.height + '% (備考が収まる高さに調整)');
  console.log('  位置: X=' + newSettings.position.x + '%, Y=' + newSettings.position.y + '%');
  console.log('\n🔍 期待される動作:');
  console.log('  - 備考欄が白枠内に収まる');
  console.log('  - 横長写真でもはみ出さない');
  console.log('  - 全ての項目が表示される');

  // 更新実行
  const { error: updateError } = await supabase
    .from('templates')
    .update({ design_settings: newSettings })
    .eq('id', current.id);

  if (updateError) {
    console.error('\n❌ 更新エラー:', updateError);
    return;
  }

  console.log('\n✅ 更新完了！ブラウザをリロードして確認してください。');
}

fixHeight().catch(console.error);
