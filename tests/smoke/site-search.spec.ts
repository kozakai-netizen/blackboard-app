import { test, expect } from "@playwright/test";

test.describe("Site Search Page @smoke", () => {
  const baseURL = `http://localhost:${process.env.PW_PORT || 3002}`;

  test("サイト検索UIが応答し、無限スピナーにならない", async ({ page }) => {
    await page.goto(`${baseURL}/sites?debug=1`);

    // 最初はスケルトンが表示される
    await expect(page.getByTestId("sites-skeleton")).toBeVisible();

    // 6秒以内に skeleton が消え、結果/空/エラーのいずれかが表示
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"],[data-testid="sites-error"]',
      { timeout: 6000 }
    );

    // デバッグバナーが表示される
    await expect(page.getByTestId("debug-banner")).toBeVisible();

    // スケルトンは消えている
    await expect(page.getByTestId("sites-skeleton")).not.toBeVisible();
  });

  test("キーワードで検索可能", async ({ page }) => {
    await page.goto(`${baseURL}/sites?debug=1`);

    // 検索ボックスに入力
    await page.getByTestId("sites-q").fill("テスト");

    // 6秒以内に結果または空の状態が表示される
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"]',
      { timeout: 6000 }
    );

    // エラーではないことを確認
    const errorVisible = await page
      .getByTestId("sites-error")
      .isVisible()
      .catch(() => false);
    expect(errorVisible).toBeFalsy();
  });

  test("/ キーで検索ボックスにフォーカス", async ({ page }) => {
    await page.goto(`${baseURL}/sites`);

    // / キーを押す
    await page.keyboard.press("/");

    // 検索ボックスがフォーカスされる
    const searchInput = page.getByTestId("sites-q");
    await expect(searchInput).toBeFocused();
  });

  test("ステータスフィルターが動作する", async ({ page }) => {
    await page.goto(`${baseURL}/sites?debug=1`);

    // 初回ロード完了を待つ
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"],[data-testid="sites-error"]',
      { timeout: 6000 }
    );

    // ステータスを変更
    await page.getByTestId("sites-status").selectOption("");

    // 再検索が走る（スケルトンが表示される）
    await expect(page.getByTestId("sites-skeleton")).toBeVisible();

    // 6秒以内に結果が表示される
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"],[data-testid="sites-error"]',
      { timeout: 6000 }
    );
  });

  test("「自分の現場のみ」トグルが動作する", async ({ page }) => {
    await page.goto(`${baseURL}/sites?debug=1`);

    // 初回ロード完了を待つ
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"],[data-testid="sites-error"]',
      { timeout: 6000 }
    );

    // チェックボックスをクリック
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.click();

    // 再検索が走る
    await expect(page.getByTestId("sites-skeleton")).toBeVisible();

    // 6秒以内に結果が表示される
    await page.waitForSelector(
      '[data-testid="sites-results"],[data-testid="sites-empty"],[data-testid="sites-error"]',
      { timeout: 6000 }
    );
  });
});
