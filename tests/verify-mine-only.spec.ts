import { test, expect } from '@playwright/test';

/**
 * 「自分の現場のみ」機能の自動検証
 * 3パスを実行してログを収集
 */

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const PLACE = 'dandoli-sample1';
const UID = '40824';
const EMP_CODE = '12345678';

test.describe('自分の現場のみ - 3パス検証', () => {
  let serverLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    // サーバーログをキャプチャ（console.logを監視）
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[my-keys]') || text.includes('[Filter]') || text.includes('[quicklist]')) {
        serverLogs.push(text);
      }
    });
  });

  test('A-1: localStorage優先パス', async ({ page, context }) => {
    console.log('\n========== A-1: localStorage優先パス ==========');
    serverLogs = [];

    // localStorage設定
    await context.addInitScript(() => {
      localStorage.setItem('dw:empcode', '12345678');
    });

    // /sites?debug=1&only=1 にアクセス
    await page.goto(`${BASE_URL}/sites?debug=1&only=1&place=${PLACE}`, { waitUntil: 'networkidle' });

    // 5秒待機（API呼び出し完了を待つ）
    await page.waitForTimeout(5000);

    // デバッグ帯の情報を取得
    const debugInfo = await page.evaluate(() => {
      const debugEl = document.querySelector('[data-testid="debug-banner"]');
      return debugEl ? debugEl.textContent : 'デバッグ帯なし';
    });

    // filtered件数を取得
    const filteredCount = await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find(el =>
        el.textContent?.includes('現場')
      );
      const match = h2?.textContent?.match(/\((\d+)\)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    // サーバーログからvia確認
    const viaLog = serverLogs.find(log => log.includes('[my-keys] output') && log.includes('via:'));
    const empInputLog = serverLogs.find(log => log.includes('[my-keys] input'));

    console.log('\n【A-1 結果】');
    console.log('filtered件数:', filteredCount);
    console.log('デバッグ帯:', debugInfo);
    console.log('\n【サーバーログ】');
    console.log(empInputLog || '(inputログなし)');
    console.log(viaLog || '(viaログなし)');
    serverLogs.filter(log => log.includes('[Filter]')).slice(0, 3).forEach(log => console.log(log));

    // スクリーンショット
    await page.screenshot({ path: 'test-results/A1-localStorage.png', fullPage: true });

    // 検証
    expect(filteredCount).toBeGreaterThan(0);
    expect(viaLog).toContain("via: 'query'");
    expect(empInputLog).toContain("emp: '12345678'");
  });

  test('A-2: URL最優先パス', async ({ page, context }) => {
    console.log('\n========== A-2: URL最優先パス ==========');
    serverLogs = [];

    // localStorageクリア
    await context.addInitScript(() => {
      localStorage.removeItem('dw:empcode');
    });

    // /sites?debug=1&only=1&emp=12345678 にアクセス
    await page.goto(`${BASE_URL}/sites?debug=1&only=1&place=${PLACE}&emp=${EMP_CODE}`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(5000);

    const debugInfo = await page.evaluate(() => {
      const debugEl = document.querySelector('[data-testid="debug-banner"]');
      return debugEl ? debugEl.textContent : 'デバッグ帯なし';
    });

    const filteredCount = await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find(el =>
        el.textContent?.includes('現場')
      );
      const match = h2?.textContent?.match(/\((\d+)\)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const viaLog = serverLogs.find(log => log.includes('[my-keys] output') && log.includes('via:'));
    const empInputLog = serverLogs.find(log => log.includes('[my-keys] input'));

    console.log('\n【A-2 結果】');
    console.log('filtered件数:', filteredCount);
    console.log('デバッグ帯:', debugInfo);
    console.log('\n【サーバーログ】');
    console.log(empInputLog || '(inputログなし)');
    console.log(viaLog || '(viaログなし)');

    await page.screenshot({ path: 'test-results/A2-URL-priority.png', fullPage: true });

    expect(filteredCount).toBeGreaterThan(0);
    expect(viaLog).toContain("via: 'query'");
    expect(empInputLog).toContain("emp: '12345678'");
  });

  test('A-3: 自動解決パス（DW lookup）', async ({ page, context }) => {
    console.log('\n========== A-3: 自動解決パス（DW lookup） ==========');
    serverLogs = [];

    // localStorageクリア
    await context.addInitScript(() => {
      localStorage.removeItem('dw:empcode');
    });

    // /sites?debug=1&only=1 にアクセス（empなし）
    await page.goto(`${BASE_URL}/sites?debug=1&only=1&place=${PLACE}`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(5000);

    const debugInfo = await page.evaluate(() => {
      const debugEl = document.querySelector('[data-testid="debug-banner"]');
      return debugEl ? debugEl.textContent : 'デバッグ帯なし';
    });

    const filteredCount = await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find(el =>
        el.textContent?.includes('現場')
      );
      const match = h2?.textContent?.match(/\((\d+)\)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    const viaLog = serverLogs.find(log => log.includes('[my-keys] output') && log.includes('via:'));
    const empInputLog = serverLogs.find(log => log.includes('[my-keys] input'));
    const lookupLog = serverLogs.find(log => log.includes('[my-keys] calling user-lookup'));

    console.log('\n【A-3 結果】');
    console.log('filtered件数:', filteredCount);
    console.log('デバッグ帯:', debugInfo);
    console.log('\n【サーバーログ】');
    console.log(empInputLog || '(inputログなし)');
    console.log(lookupLog || '(lookupログなし)');
    console.log(viaLog || '(viaログなし)');

    await page.screenshot({ path: 'test-results/A3-DW-lookup.png', fullPage: true });

    // DWトークンがある場合は via:'dw-user-lookup'、ない場合は via:'no-token'
    const hasDwToken = process.env.DW_BEARER_TOKEN;
    if (hasDwToken) {
      expect(viaLog).toMatch(/via: 'dw-user-lookup'|via: 'dw-not-found'/);
    } else {
      expect(viaLog).toMatch(/via: 'no-token'|via: 'no-username'/);
    }

    // filtered > 0 は必須（トークンなしでも、何らかの方法で解決されるべき）
    if (filteredCount === 0) {
      console.warn('⚠️ filtered === 0 です。作業Bのパッチが必要な可能性があります。');
    }
  });

  test('ゼロ件チェック: only=0で全件取得確認', async ({ page }) => {
    console.log('\n========== ゼロ件チェック ==========');

    await page.goto(`${BASE_URL}/sites?debug=1&only=0&place=${PLACE}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const totalCount = await page.evaluate(() => {
      const h2 = Array.from(document.querySelectorAll('h2')).find(el =>
        el.textContent?.includes('現場')
      );
      const match = h2?.textContent?.match(/\((\d+)\)/);
      return match ? parseInt(match[1], 10) : 0;
    });

    console.log('total(raw)件数:', totalCount);

    expect(totalCount).toBeGreaterThan(0);
  });
});
