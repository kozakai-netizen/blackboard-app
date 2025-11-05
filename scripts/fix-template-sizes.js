// scripts/fix-template-sizes.js
// テンプレートのサイズを修正するスクリプト

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

async function fixTemplateSizes() {
  console.log('🔧 テンプレートサイズを修正中...\n');

  // 「田中チーム専用」を修正
  const { data: tanaka, error: tanakaError } = await supabase
    .from('templates')
    .select('*')
    .eq('name', '田中チーム専用')
    .single();

  if (!tanakaError && tanaka) {
    const updatedSettings = {
      ...tanaka.design_settings,
      width: 35,  // 80% → 35%
      height: 25  // 20% → 25%（フィールド数に応じて調整）
    };

    const { error: updateError } = await supabase
      .from('templates')
      .update({ design_settings: updatedSettings })
      .eq('id', tanaka.id);

    if (updateError) {
      console.error('❌ 田中チーム専用の更新に失敗:', updateError);
    } else {
      console.log('✅ 田中チーム専用を修正: width 80% → 35%, height 20% → 25%');
    }
  }

  // 「国交省標準仕様黒板」を修正
  const { data: kokko, error: kokkoError } = await supabase
    .from('templates')
    .select('*')
    .eq('name', '国交省標準仕様黒板')
    .single();

  if (!kokkoError && kokko) {
    const updatedSettings = {
      ...kokko.design_settings,
      width: 40,  // 80% → 40%
      height: 22  // 20% → 22%（フィールド数が少ないので）
    };

    const { error: updateError } = await supabase
      .from('templates')
      .update({ design_settings: updatedSettings })
      .eq('id', kokko.id);

    if (updateError) {
      console.error('❌ 国交省標準仕様黒板の更新に失敗:', updateError);
    } else {
      console.log('✅ 国交省標準仕様黒板を修正: width 80% → 40%, height 20% → 22%');
    }
  }

  console.log('\n📋 修正後のサイズ:');
  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  templates.forEach(template => {
    const { name, design_settings } = template;
    const { width, height } = design_settings;
    console.log(`  ${name}: width=${width}%, height=${height}%`);
  });
}

fixTemplateSizes();
