import { test, expect } from '@playwright/test'
import { gateInfra } from '../helpers/health'

/**
 * スモークテスト: 現場一覧表示
 * @smoke タグで最小限のテストのみ実行
 *
 * テスト内容:
 * 1. 現場一覧ページにアクセス
 * 2. タイトルが表示されることを確認
 * 3. 現場カードが表示されることを確認
 */
test.describe('現場一覧 @smoke', () => {
  test.beforeAll(async ({ baseURL }) => {
    await gateInfra(test, baseURL!);
  });

  test('現場一覧ページが正常に表示される', async ({ page }) => {
    console.log('🧪 [Smoke Test] 現場一覧ページへ遷移')

    // 現場一覧ページへアクセス
    await page.goto('/sites')
    console.log('✅ [Smoke Test] ページ遷移完了')

    // タイトルが表示されることを確認
    await expect(page.locator('h1')).toContainText('現場一覧')
    console.log('✅ [Smoke Test] タイトル表示確認')

    // 現場カードまたはテーブルが表示されることを確認（どちらかが表示されればOK）
    // まずカードが表示されるまで待機
    const cardExists = await page.locator('[data-testid="site-card"]').first().isVisible({ timeout: 10000 }).catch(() => false)

    if (cardExists) {
      console.log('✅ [Smoke Test] 現場カード表示確認')
    } else {
      // カードがない場合はテーブル表示を確認
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 5000 })
      console.log('✅ [Smoke Test] 現場テーブル表示確認')
    }
  })

  // CI で flaky なアニメーションテストは隔離
  test.fixme(process.env.CI === 'true', 'アニメーション確認（CI では不安定）', async ({ page }) => {
    await page.goto('/sites')

    // ホバー時のアニメーション確認（ローカルのみ）
    const firstCard = page.locator('[data-testid="site-card"]').first()
    await firstCard.hover()
    await expect(firstCard).toHaveClass(/hover:shadow-lg/)
  })
})
