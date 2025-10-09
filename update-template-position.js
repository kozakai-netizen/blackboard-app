// 既存テンプレート「ダミー黒板」の位置を更新
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// .env.localを手動で読み込む
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateTemplatePosition() {
  try {
    // ダミー黒板テンプレートを取得
    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('name', 'ダミー黒板')
      .single();

    if (fetchError) {
      console.error('❌ テンプレート取得エラー:', fetchError);
      return;
    }

    if (!template) {
      console.log('⚠️ テンプレート「ダミー黒板」が見つかりません');
      return;
    }

    console.log('📝 現在の設定:');
    console.log('  Position:', template.design_settings.position);
    console.log('  Size:', { width: template.design_settings.width, height: template.design_settings.height });

    // 新しい位置設定（写真の左下角に合わせる）
    const updatedSettings = {
      ...template.design_settings,
      position: { x: 2, y: 78 },  // 左下角に配置
      height: 20,
      width: 35  // 幅も調整
    };

    // 更新
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        design_settings: updatedSettings,
        updated_at: new Date().toISOString()
      })
      .eq('id', template.id);

    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }

    console.log('✅ テンプレート「ダミー黒板」の位置を更新しました！');
    console.log('  新しい Position:', updatedSettings.position);
    console.log('  新しい Height:', updatedSettings.height);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

updateTemplatePosition();
