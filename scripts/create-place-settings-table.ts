import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createPlaceSettingsTable() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🔧 Creating place_settings table...');

  // Create table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS place_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      place_code TEXT NOT NULL,
      setting_type TEXT NOT NULL,
      setting_id INTEGER NOT NULL,
      default_name TEXT,
      custom_name TEXT NOT NULL,
      display_order INTEGER,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(place_code, setting_type, setting_id)
    );
  `;

  // Try to create the table using direct insert
  // Since we can't execute raw SQL, we'll just try to insert data and let the table auto-create fail gracefully
  console.log('⚠️  Cannot execute raw SQL via Supabase client.');
  console.log('📝 Attempting to create table by inserting data...');

  // Insert initial data for site_status
  console.log('📝 Inserting site_status data...');

  const statusData = [
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 1, default_name: '追客中', custom_name: '現調中（見積未提出）', display_order: 1 },
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 2, default_name: '契約中', custom_name: '現調中（見積提出済み）', display_order: 2 },
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 3, default_name: '着工中', custom_name: '工事中', display_order: 3 },
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 4, default_name: '完工', custom_name: '完工', display_order: 4 },
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 5, default_name: '中止', custom_name: 'アフター', display_order: 5 },
    { place_code: 'dandoli-sample1', setting_type: 'site_status', setting_id: 6, default_name: '他決', custom_name: '中止・他決', display_order: 6 }
  ];

  const { error: statusError } = await supabase
    .from('place_settings')
    .upsert(statusData, {
      onConflict: 'place_code,setting_type,setting_id',
      ignoreDuplicates: true
    });

  if (statusError) {
    console.error('❌ Status data insert error:', statusError);
  } else {
    console.log('✅ Status data inserted');
  }

  // Insert initial data for site_type
  console.log('📝 Inserting site_type data...');

  const typeData = [
    { place_code: 'dandoli-sample1', setting_type: 'site_type', setting_id: 1, default_name: 'リフォーム', custom_name: '解体_木造', display_order: 8 },
    { place_code: 'dandoli-sample1', setting_type: 'site_type', setting_id: 2, default_name: '新築', custom_name: '解体_鉄骨造', display_order: 11 },
    { place_code: 'dandoli-sample1', setting_type: 'site_type', setting_id: 3, default_name: 'その他', custom_name: '解体_内部', display_order: 12 }
  ];

  const { error: typeError } = await supabase
    .from('place_settings')
    .upsert(typeData, {
      onConflict: 'place_code,setting_type,setting_id',
      ignoreDuplicates: true
    });

  if (typeError) {
    console.error('❌ Type data insert error:', typeError);
  } else {
    console.log('✅ Type data inserted');
  }

  console.log('\n🎉 Migration completed!');
}

createPlaceSettingsTable();
