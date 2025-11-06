import fs from 'fs';

const checks: [string, RegExp][] = [
  ['lib/ui/theme.ts', /UI PRESET V2 LOCK/],
  ['components/ui/SiteChip.tsx', /chipViolet/],
  ['lib/sites/chipStyle.ts', /typeVariant/],
  ['components/sites/Toolbar.tsx', /現場検索/],
  ['components/sites/views/GridView.tsx', /cardSize/],
  ['components/sites/views/GalleryView.tsx', /tone\.surface/],
  ['components/sites/views/KanbanView.tsx', /tone\.surface/],
];

let ok = true;
for (const [file, re] of checks) {
  const s = fs.readFileSync(file, 'utf8');
  if (!re.test(s)) {
    console.error(`NG: ${file} missing ${re}`);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}

console.log('OK: UI preset v2 markers detected.');
