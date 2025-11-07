const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd){ cp.execSync(cmd, { stdio: 'inherit' }); }

run('node scripts/ui-snapshot.js');           // コード保存 & zip
try { run('node scripts/ui-capture.js'); }     // サーバー動いてたらスクショ
catch(e){ console.log('[ui-freeze] capture skipped:', e.message); }

const OUT_DIR = 'ui_releases';
const tags = fs.readdirSync(OUT_DIR).filter(n=>n.startsWith('ui-snap-') && !n.endsWith('.zip')).sort();
const tag = tags[tags.length-1];
try {
  // ローカルに軽いタグ打ち（pushはしない）
  run(`git tag -f ${tag}`);
  console.log(`[ui-freeze] tagged: ${tag}`);
} catch (e) { console.log('[ui-freeze] tag failed (non-fatal):', e.message); }

const baseDir = path.join(OUT_DIR, tag);
console.log(`\n✅ 完了: ${baseDir}`);
console.log('復元コマンド（ファイル単位で戻す）:');
console.log(`  npm run ui:restore -- ${tag}\n`);
