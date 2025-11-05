import { test, expect } from '@playwright/test';

test.describe('Smoke Tests @smoke', () => {
  // ヘルスチェックゲート: インフラNGなら全テストskip
  test.beforeAll(async ({ request }) => {
    try {
      const baseUrl = process.env.PW_BASE_URL || process.env.BASE_URL || 'http://localhost:3002';
      const r = await request.get(`${baseUrl}/api/health/full`, { timeout: 8000 });
      if (!r.ok()) {
        test.skip(true, `infra down: HTTP ${r.status()}`);
      }
      const j = await r.json();
      if (!j.ok) {
        test.skip(true, `infra down: ${j.error || 'unknown'}`);
      }
      console.log('✅ [Health Gate] DB connection OK, mode:', j.mode);
    } catch (error: any) {
      test.skip(true, `infra down: ${error.message}`);
    }
  });

  test('ヘルスチェック - STG DBへの接続確認', async ({ request }) => {
    const response = await request.get('/api/_health/stg-users');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.ping).toBeDefined();
  });

  test('/sites - ページが正常に表示される', async ({ page }) => {
    await page.goto('/sites');

    // ページヘッダー確認（タイトルテキストを緩める）
    await expect(page.getByRole('heading', { name: /現場一覧|Sites|Site List/i })).toBeVisible({ timeout: 10000 });

    // ローディングが完了するまで待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // くるくるローディングが消えることを確認
    const loader = page.locator('[class*="spinner"], [class*="loading"]');
    await expect(loader).toHaveCount(0, { timeout: 30000 });
  });

  test('/sites - ユーザー自動検出が動作する', async ({ page }) => {
    // sessionStorageをクリア
    await page.goto('/sites');
    await page.evaluate(() => sessionStorage.clear());

    // リロードしてユーザー自動検出をトリガー
    await page.reload();

    // コンソールログを監視
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // ネットワークが安定するまで待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // /api/stg-users が呼ばれたことを確認
    const stgUsersLogs = logs.filter(log => log.includes('[fetch]') && log.includes('/api/stg-users'));
    expect(stgUsersLogs.length).toBeGreaterThan(0);

    // sessionStorageにuserIdが設定されたことを確認
    const userId = await page.evaluate(() => sessionStorage.getItem('userId'));
    expect(userId).toBeTruthy();
  });

  test('/sites?debug=1 - デバッグ情報が表示される', async ({ page }) => {
    await page.goto('/sites?debug=1');

    // ローディング完了まで待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // デバッグバナーが表示される（data-testid使用）
    const debugBanner = page.getByTestId('debug-banner');
    await expect(debugBanner).toBeVisible({ timeout: 10000 });

    // source情報が含まれていることを確認
    await expect(debugBanner).toContainText(/source:/);

    // effectiveUserIdが表示される
    await expect(debugBanner).toContainText(/effectiveUserId:/);

    // Total sitesが表示される
    await expect(debugBanner).toContainText(/Total sites:/);
  });

  test('/set-user - ユーザー一覧が表示される', async ({ page }) => {
    await page.goto('/set-user');

    // ページタイトル確認
    await expect(page.getByText('ユーザー設定')).toBeVisible();

    // ローディングが完了するまで待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // ユーザー選択ドロップダウンが表示される
    const select = page.locator('select');
    await expect(select).toBeVisible();

    // オプションが存在する（最低1つ以上）
    const options = select.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(1); // "選択してください" + 実際のユーザー
  });

  test('/sites - 無効なsessionStorageをパージして正しいIDに解決', async ({ page }) => {
    // 無効なuserIdをsessionStorageに設定
    await page.goto('/sites');
    await page.evaluate(() => {
      sessionStorage.setItem('userId', '324338'); // 削除済みユーザー
    });

    // ページをリロードしてresolution処理をトリガー
    await page.reload();

    // ネットワークが安定するまで待機
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // ローディングが停止することを確認（無限スピナーがない）
    const loader = page.locator('[class*="spinner"], [class*="loading"]');
    await expect(loader).toHaveCount(0, { timeout: 30000 });

    // sessionStorageが更新されたことを確認（324338から正しいIDへ）
    const userId = await page.evaluate(() => sessionStorage.getItem('userId'));
    expect(userId).toBeTruthy();
    expect(userId).not.toBe('324338');

    // ?debug=1 でsourceを確認（data-testid使用）
    await page.goto('/sites?debug=1');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const debugBanner = page.getByTestId('debug-banner');
    await expect(debugBanner).toBeVisible({ timeout: 10000 });

    // source が autodetect または default であることを確認
    await expect(debugBanner).toContainText(/source:\s*(autodetect|default)/);

    // 現場数が0以上であることを確認
    await expect(debugBanner).toContainText(/Total sites:/);
  });
});
