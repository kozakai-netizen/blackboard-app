// scripts/update-kokukosho-size.cjs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSize() {
  console.log('🔧 国交省標準黒板のサイズを更新します...\n');

  // 現在の設定を取得
  const { data: current, error: fetchError } = await supabase
    .from('templates')
    .select('id, name, design_settings')
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
  console.log('  位置:', current.design_settings.position);

  // 新しい設定
  const newSettings = {
    ...current.design_settings,
    width: 50,   // 40% → 50% (25%大きく)
    height: 40,  // 32% → 40% (25%大きく)
    position: {
      x: 0,      // 左端固定
      y: 60      // 少し上に (68% → 60%)
    }
  };

  console.log('\n✨ 新しい設定:');
  console.log('  幅:', newSettings.width + '%');
  console.log('  高さ:', newSettings.height + '%');
  console.log('  位置:', newSettings.position);

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

updateSize().catch(console.error);
