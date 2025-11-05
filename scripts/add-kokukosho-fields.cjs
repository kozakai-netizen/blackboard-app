const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addFields() {
  console.log('📝 国交省標準黒板にフィールドを追加します...\n');

  // 現在のフィールド取得
  const { data: current } = await supabase
    .from('templates')
    .select('fields')
    .ilike('name', '%国交省%')
    .single();

  console.log('現在のフィールド:', current.fields);

  // 新しいフィールド（立会者、測点位置、備考を追加）
  const newFields = [
    "工事名",
    "工種",
    "種別",
    "細別",
    "撮影日",
    "施工者",
    "撮影場所",
    "測点位置",  // 追加
    "立会者",    // 追加
    "備考"       // 追加
  ];

  console.log('\n新しいフィールド:', newFields);

  // 更新実行
  const { error } = await supabase
    .from('templates')
    .update({ fields: newFields })
    .ilike('name', '%国交省%');

  if (error) {
    console.error('\n❌ エラー:', error);
    return;
  }

  console.log('\n✅ フィールド更新完了！');
  console.log('   - 立会者: 追加');
  console.log('   - 測点位置: 追加');
  console.log('   - 備考: 追加');
}

addFields();
