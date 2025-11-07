const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const FILES = [
  'lib/ui/theme.ts',
  'components/ui/SiteChip.tsx',
  'lib/sites/chipStyle.ts',
  'components/sites/Toolbar.tsx',
  'components/sites/views/GridView.tsx',
  'components/sites/views/GalleryView.tsx',
  'components/sites/views/KanbanView.tsx',
  'components/sites/views/ListView.tsx',
];

const OUT_DIR = 'ui_releases';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const tag = `ui-snap-${stamp.slice(0,16)}`; // 分まで
const baseDir = path.join(OUT_DIR, tag);
const codeDir = path.join(baseDir, 'code');
fs.mkdirSync(codeDir, { recursive: true });

const manifest = [];
for (const f of FILES) {
  const ok = fs.existsSync(f);
  const rec = { file: f, exists: ok };
  if (ok) {
    const buf = fs.readFileSync(f);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    const destPath = path.join(codeDir, f);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    rec.sha256 = sha; rec.bytes = buf.length;
  }
  manifest.push(rec);
}
fs.writeFileSync(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

try {
  const rev = cp.execSync('git rev-parse --short HEAD').toString().trim();
  fs.writeFileSync(path.join(baseDir, 'REVISION.txt'), rev + '\n');
} catch (_) {}

console.log(`[ui-snapshot] saved to ${baseDir}`);
try {
  cp.execSync(`cd ${OUT_DIR} && zip -r ${tag}.zip ${tag}`, { stdio: 'inherit' });
  console.log(`[ui-snapshot] zip: ${path.join(OUT_DIR, `${tag}.zip`)}`);
} catch (e) {
  console.warn('[ui-snapshot] zip failed (non-fatal):', e.message);
}

// 直近の同系タグを探して差分メモを吐く
try {
  const last = cp.execSync(`git tag --list 'ui-snap-*' --sort=-creatordate | sed -n '2p'`).toString().trim();
  if (last) {
    const diff = cp.execSync(`git --no-pager diff --name-only ${last}..HEAD -- lib/ui components/ui components/sites`, {encoding:'utf8'});
    fs.writeFileSync(path.join(baseDir, 'DIFF_SINCE_PREV.txt'), diff || '(no changes)\n');
  }
} catch (e) {
  /* ignore */
}

console.log(`[ui-snapshot] tag: ${tag} (not pushed)`);
fs.writeFileSync(path.join(baseDir, 'TAG.txt'), tag+'\n');
