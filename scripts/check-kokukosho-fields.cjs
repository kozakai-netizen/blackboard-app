const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .ilike('name', '%国交省%')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  console.log('📋 テンプレート:', data.name);
  console.log('\n📌 フィールド一覧:');
  console.log(JSON.stringify(data.fields, null, 2));
  console.log('\n📊 デフォルト値:');
  console.log(JSON.stringify(data.default_values, null, 2));
}

check();
