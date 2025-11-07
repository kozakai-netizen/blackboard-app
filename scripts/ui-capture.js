const { chromium } = require('playwright');
const fs = require('fs');
const cp = require('child_process');

(async () => {
  const OUT_DIR = 'ui_releases';
  const tags = fs.readdirSync(OUT_DIR).filter(n=>n.startsWith('ui-snap-') && !n.endsWith('.zip')).sort();
  const tag = tags[tags.length-1];
  const shotDir = `${OUT_DIR}/${tag}/screens`;
  fs.mkdirSync(shotDir, { recursive: true });

  const base = process.env.PW_BASE_URL || 'http://localhost:3002';
  // 軽いヘルス確認（失敗したらキャプチャはスキップ）
  try {
    cp.execSync(`node -e "require('http').get('${base}/api/health/full',r=>{process.exit(r.statusCode===200?0:1)})"`);
  } catch {
    console.log('[ui-capture] devサーバー未起動のためスクショはスキップ');
    process.exit(0);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }});
  await page.goto(`${base}/sites?debug=1`, { waitUntil: 'networkidle' });

  async function shot(name){ await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true }); }
  // リスト→カード→ギャラリー→カンバン の順で撮影
  await shot('list');

  const switcher = page.getByTestId('view-mode-switcher');
  await switcher.getByText('カード').click();   await page.waitForTimeout(300); await shot('grid');
  await switcher.getByText('ギャラリー').click(); await page.waitForTimeout(300); await shot('gallery');
  await switcher.getByText('カンバン').click();   await page.waitForTimeout(300); await shot('kanban');

  await browser.close();
  console.log(`[ui-capture] saved to ${shotDir}`);
})();
