const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSize() {
  console.log('📏 国交省標準黒板のサイズを最適化します...\n');

  // 最適なサイズ設定（10フィールド + 備考対応）
  const newSettings = {
    style: 'black',
    width: 45,      // 幅は維持
    height: 30,     // 35% → 30% (適度なサイズ)
    bgColor: '#000000',
    opacity: 85,
    fontSize: 'standard',
    position: {
      x: 2,
      y: 65       // 60% → 65% (少し下げる)
    },
    textColor: '#FFFFFF'
  };

  const { error } = await supabase
    .from('templates')
    .update({ design_settings: newSettings })
    .ilike('name', '%国交省%');

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('✅ サイズ調整完了！');
  console.log('   高さ: 30%');
  console.log('   位置Y: 65%');
  console.log('\nブラウザをリロードしてください。');
}

fixSize();
