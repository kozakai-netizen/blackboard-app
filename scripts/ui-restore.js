const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const tag = process.argv[2];
if (!tag) { console.error('Usage: npm run ui:restore -- <tag>'); process.exit(1); }
const dir = path.join('ui_releases', tag, 'code');
if (!fs.existsSync(dir)) { console.error(`not found: ${dir}`); process.exit(1); }

function copyTree(src, dst){
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name), d = path.join(dst, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive:true }); copyTree(s, d); }
    else { fs.mkdirSync(path.dirname(d), { recursive:true }); fs.copyFileSync(s, d); }
  }
}
copyTree(dir, '.');
console.log(`[ui-restore] restored files from ${dir}`);
try { cp.execSync('rm -rf .next', {stdio:'inherit'}); } catch {}
