// scripts/check-template.cjs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'NOT SET');
  process.exit(1);
}

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
