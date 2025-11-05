const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function adjustHeight() {
  console.log('📏 国交省標準黒板の高さを調整します...\n');

  // 現在の設定取得
  const { data: current } = await supabase
    .from('templates')
    .select('design_settings, fields')
    .ilike('name', '%国交省%')
    .single();

  console.log('現在の設定:');
  console.log('  高さ:', current.design_settings.height + '%');
  console.log('  位置Y:', current.design_settings.position.y + '%');
  console.log('  フィールド数:', current.fields.length, '個');

  // 10フィールド（工事名含む）+ 備考が収まる高さ = 35%
  const newSettings = {
    ...current.design_settings,
    height: 35,  // 28% → 35% (10フィールド + 備考対応)
    position: {
      x: 2,
      y: 60   // 67% → 60% (さらに上に移動)
    }
  };

  console.log('\n新しい設定:');
  console.log('  高さ:', newSettings.height + '% (+7% 増加)');
  console.log('  位置Y:', newSettings.position.y + '% (上に移動)');

  // 更新実行
  const { error } = await supabase
    .from('templates')
    .update({ design_settings: newSettings })
    .ilike('name', '%国交省%');

  if (error) {
    console.error('\n❌ エラー:', error);
    return;
  }

  console.log('\n✅ 高さ調整完了！ブラウザをリロードしてください。');
}

adjustHeight();
