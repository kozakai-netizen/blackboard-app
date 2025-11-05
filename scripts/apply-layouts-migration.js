// scripts/apply-layouts-migration.js
// layoutsテーブルとデータを作成するスクリプト

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.localから環境変数を読み込む
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY  // 管理者権限で実行
);

async function applyMigration() {
  console.log('🚀 Applying layouts migration...\n');

  try {
    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251016_create_layouts_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);

      // 直接クエリを分割して実行
      console.log('\n📝 Trying manual execution...\n');
      await manualExecution();
    } else {
      console.log('✅ Migration applied successfully!');
      await verifyData();
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📝 Trying manual execution...\n');
    await manualExecution();
  }
}

async function manualExecution() {
  // 1. テーブル作成
  console.log('1. Creating layouts table...');
  const { error: createTableError } = await supabase.rpc('exec_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS layouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        layout_key TEXT UNIQUE NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        thumbnail_url TEXT,
        is_system BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `
  });

  if (createTableError) {
    console.error('❌ Create table failed:', createTableError);
  } else {
    console.log('✅ layouts table created');
  }

  // 2. templates に layout_id 追加
  console.log('\n2. Adding layout_id to templates...');
  const { error: alterTableError } = await supabase.rpc('exec_sql', {
    sql_query: `
      ALTER TABLE templates
      ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES layouts(id);
    `
  });

  if (alterTableError) {
    console.log('⚠️ Column might already exist:', alterTableError.message);
  } else {
    console.log('✅ layout_id column added');
  }

  // 3. インデックス作成
  console.log('\n3. Creating indexes...');
  await supabase.rpc('exec_sql', {
    sql_query: `CREATE INDEX IF NOT EXISTS idx_layouts_layout_key ON layouts(layout_key);`
  });
  await supabase.rpc('exec_sql', {
    sql_query: `CREATE INDEX IF NOT EXISTS idx_templates_layout_id ON templates(layout_id);`
  });
  console.log('✅ Indexes created');

  // 4. データ挿入
  console.log('\n4. Inserting layout data...');
  const layouts = [
    {
      name: '標準レイアウト（左下）',
      description: '黒板を写真の左下に配置。工事名を上部に表示し、その他項目を2列グリッドで配置',
      layout_key: 'standard-left-bottom',
      config: {
        position: {x: 0.02, y: 0.78},
        width: 0.35,
        height: 0.20,
        grid: {columns: 2, gap: 0.02},
        titlePlacement: 'top-full-width'
      },
      display_order: 1
    },
    {
      name: '中央配置',
      description: '黒板を写真の中央に大きく配置',
      layout_key: 'center',
      config: {
        position: {x: 0.25, y: 0.40},
        width: 0.50,
        height: 0.30,
        grid: {columns: 2, gap: 0.02},
        titlePlacement: 'top-full-width'
      },
      display_order: 2
    },
    // ... 他のレイアウトも追加
  ];

  for (const layout of layouts) {
    const { error } = await supabase
      .from('layouts')
      .upsert(layout, { onConflict: 'layout_key' });

    if (error) {
      console.error(`❌ Failed to insert ${layout.name}:`, error);
    } else {
      console.log(`✅ ${layout.name}`);
    }
  }

  await verifyData();
}

async function verifyData() {
  console.log('\n📊 Verification:\n');

  const { data: layouts, error } = await supabase
    .from('layouts')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('❌ Verification failed:', error);
  } else {
    console.log(`✅ ${layouts.length} layouts created:`);
    layouts.forEach(layout => {
      console.log(`  - ${layout.name} (${layout.layout_key})`);
    });
  }
}

applyMigration();
