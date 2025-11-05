// scripts/check-templates.js
// テンプレートのサイズ設定を確認するスクリプト

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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTemplates() {
  console.log('📋 テンプレートサイズ設定を確認中...\n');

  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  templates.forEach(template => {
    const { name, design_settings } = template;
    const { width, height, position } = design_settings;

    console.log(`📌 ${name}`);
    console.log(`   Width: ${width}% (${1200 * width / 100}px @ 1200px image)`);
    console.log(`   Height: ${height}% (${900 * height / 100}px @ 900px image)`);
    console.log(`   Position: (${position.x}%, ${position.y}%)`);
    console.log('');
  });
}

checkTemplates();
