// scripts/fix-template-heights.js
// テンプレートの高さを増やしてテキスト切れを解消するスクリプト

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

async function fixTemplateHeights() {
  console.log('🔧 テンプレートの高さを修正中...\n');

  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  for (const template of templates) {
    const { id, name, design_settings, fields } = template;

    // フィールド数に応じて高さを計算
    const fieldCount = fields.length;
    let newHeight;

    if (fieldCount <= 5) {
      newHeight = 28; // 少ない場合
    } else if (fieldCount <= 8) {
      newHeight = 32; // 中程度
    } else {
      newHeight = 36; // 多い場合
    }

    const updatedSettings = {
      ...design_settings,
      height: newHeight
    };

    const { error: updateError } = await supabase
      .from('templates')
      .update({ design_settings: updatedSettings })
      .eq('id', id);

    if (updateError) {
      console.error(`❌ ${name}の更新に失敗:`, updateError);
    } else {
      console.log(`✅ ${name}: height ${design_settings.height}% → ${newHeight}% (${fieldCount}個のフィールド)`);
    }
  }

  console.log('\n📋 修正後のサイズ:');
  const { data: updatedTemplates } = await supabase
    .from('templates')
    .select('*')
    .order('name');

  updatedTemplates.forEach(template => {
    const { name, design_settings, fields } = template;
    const { width, height } = design_settings;
    console.log(`  ${name}: width=${width}%, height=${height}% (${fields.length}個のフィールド)`);
  });
}

fixTemplateHeights();
