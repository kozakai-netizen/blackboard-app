// scripts/check-template.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTemplate() {
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
  console.log('  layout_id:', data.layout_id);
  console.log('  design_settings:');
  console.log(JSON.stringify(data.design_settings, null, 2));
}

checkTemplate();
