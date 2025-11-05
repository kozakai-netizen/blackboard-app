// scripts/fix-kokukosho-layout.cjs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtdgyaldlleueflutjop.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0ZGd5YWxkbGxldWVmbHV0am9wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM4ODMyMSwiZXhwIjoyMDc0OTY0MzIxfQ.6ULQZuzLV3oNE141Uq9-8bA1CCoKJ7AQg9DiQaaqH_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLayout() {
  console.log('🔧 国交省標準黒板のレイアウトを修正します...\n');

  // 現在の設定を取得
  const { data: current, error: fetchError } = await supabase
    .from('templates')
    .select('id, name, design_settings, fields')
    .ilike('name', '%国交省%')
    .limit(1)
    .single();

  if (fetchError) {
    console.error('❌ テンプレート取得エラー:', fetchError);
    return;
  }

  console.log('📋 現在の設定:');
  console.log('  幅:', current.design_settings.width + '%');
  console.log('  高さ:', current.design_settings.height + '%');
  console.log('  位置: Y=' + current.design_settings.position.y + '%');
  console.log('  フィールド数:', current.fields.length);

  // 動的高さ計算をシミュレート
  const fields = current.fields;
  const rows = Math.ceil(fields.filter(f => f !== '工事名' && f !== '備考').length / 2);
  console.log('\n計算結果:');
  console.log('  工事名以外の項目: ' + (fields.length - 1));
  console.log('  必要な行数: ' + rows + '行');
  console.log('  推定必要高さ: 約25-30%');

  // 新しい設定（動的計算を優先）
  const newSettings = {
    ...current.design_settings,
    width: 45,   // 50% → 45% (少し小さく、はみ出し防止)
    height: 22,  // 40% → 22% (動的計算を優先できる最小値)
    position: {
      x: 2,      // 左端から2%の余白
      y: 72      // 下から28% (72% + 22% + マージン = 約95%)
    }
  };

  console.log('\n✨ 新しい設定:');
  console.log('  幅:', newSettings.width + '% (画面の半分弱)');
  console.log('  高さ:', newSettings.height + '% (最小値、動的計算が優先される)');
  console.log('  位置: X=' + newSettings.position.x + '%, Y=' + newSettings.position.y + '%');
  console.log('\n🔍 期待される動作:');
  console.log('  - 動的計算で約25-30%の高さになる');
  console.log('  - 横長写真でもはみ出さない');
  console.log('  - 項目間の間隔が適切に保たれる');

  // 更新実行
  const { error: updateError } = await supabase
    .from('templates')
    .update({ design_settings: newSettings })
    .eq('id', current.id);

  if (updateError) {
    console.error('\n❌ 更新エラー:', updateError);
    return;
  }

  console.log('\n✅ 更新完了！ブラウザをリロードして確認してください。');
}

fixLayout().catch(console.error);
