// scripts/check-template-direct.cjs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplate() {
  console.log('🔍 Searching for 国交省 template...\n');

  const { data, error } = await supabase
    .from('templates')
    .select('id, name, layout_id, design_settings')
    .ilike('name', '%国交省%')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ Error fetching template:', error);
    return;
  }

  console.log('✅ Template found:');
  console.log('  ID:', data.id);
  console.log('  Name:', data.name);
  console.log('  layout_id:', data.layout_id || '(null)');
  console.log('\n📋 design_settings:');
  console.log(JSON.stringify(data.design_settings, null, 2));

  // 型判定
  const ds = data.design_settings;
  console.log('\n🔍 Type detection:');
  console.log('  Has "board" property:', 'board' in ds);
  console.log('  Has "position" property:', 'position' in ds);
  console.log('  Has "width" property:', 'width' in ds);
  console.log('  Detected as:', 'board' in ds ? 'LayoutConfig (NEW)' : 'BlackboardDesignSettings (OLD)');
}

checkTemplate().catch(console.error);
