# E2Eテスト運用ガイド

## 概要

このプロジェクトでは Playwright を使用した E2E テストを導入しています。
GitHub Actions の無料枠を節約するため、**二段構え**のテスト戦略を採用しています。

---

## テスト戦略

### 1. スモークテスト（Smoke Tests）

**実行タイミング**: 全てのPR（コード変更時のみ）

- **対象ブラウザ**: chromium のみ
- **テスト内容**: `@smoke` タグが付いた最小限のテストのみ
- **実行時間**: 約2-3分
- **目的**: 基本動作の確認（起動 → 主要画面表示 → 基本操作）

### 2. フルテスト（Full E2E Tests）

**実行タイミング**: 以下の場合のみ

1. PR に `run-e2e` ラベルが付いた時
2. 手動実行（workflow_dispatch）
3. `main` ブランチへの push

- **対象ブラウザ**: chromium, webkit, firefox
- **テスト内容**: 全テスト
- **実行時間**: 約10-15分/ブラウザ（合計30-45分）
- **目的**: 全機能の動作確認、クロスブラウザテスト

---

## 開発フロー

### 通常のPR作成

```bash
# 1. コード変更
git add .
git commit -m "feat: 新機能追加"

# 2. PRを作成
git push origin feature/your-branch

# 3. スモークテストのみ自動実行（2-3分）
#    → 緑になったらマージ可能
```

### フルテストを実行したい場合

#### 方法1: ラベルを付ける

1. GitHubのPRページで `run-e2e` ラベルを付ける
2. 自動的にフルテストが実行される
3. 全ブラウザでテストが完了（30-45分）

#### 方法2: 手動実行

1. GitHub Actions タブを開く
2. `Playwright Full E2E` ワークフローを選択
3. `Run workflow` → ブランチを選択 → `Run workflow`

---

## ローカルでのテスト実行

### スモークテストのみ実行

```bash
npm run test:e2e:smoke
```

### 全テスト実行

```bash
npm run test:e2e
```

### UIモードで実行（デバッグ用）

```bash
npm run test:e2e:ui
```

### デバッグモード

```bash
npm run test:e2e:debug
```

### レポート表示

```bash
npm run test:e2e:report
```

---

## CI分数の節約ポイント

### 1. コード変更がない場合はスキップ

以下のファイルのみ変更した場合、テストはスキップされます（NOOPで緑）:

- `README.md`
- `.github/**` (workflow以外)
- `docs/**`

### 2. 並列実行のキャンセル

同じブランチで複数回pushした場合、古い実行は自動的にキャンセルされます。

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 3. キャッシュの活用

Playwright ブラウザのインストールをキャッシュして高速化しています。

### 4. 失敗時のみトレース保存

成功時はトレース/スクリーンショット/動画を保存しません（ストレージ節約）。

---

## テストの書き方

### スモークテスト（必須タグ: @smoke）

```typescript
import { test, expect } from '@playwright/test'

test.describe('機能名 @smoke', () => {
  test('最小限の動作確認', async ({ page }) => {
    await page.goto('/path')
    await expect(page.locator('h1')).toBeVisible()
  })
})
```

### フルテスト（タグなし）

```typescript
import { test, expect } from '@playwright/test'

test.describe('機能名の詳細テスト', () => {
  test('詳細な動作確認', async ({ page }) => {
    // 詳細なテストケース
  })
})
```

### CI で不安定なテストの隔離

```typescript
test.fixme(process.env.CI === 'true', 'CI で flaky', async ({ page }) => {
  // アニメーション確認など、CIで不安定なテスト
})
```

---

## トラブルシューティング

### テストがタイムアウトする

```typescript
test('遅い処理', async ({ page }) => {
  await page.goto('/slow-page', { timeout: 60000 })
})
```

### 環境変数が必要な場合

GitHub Actions の Secrets に以下を設定:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 分数使用量の目安

| 実行 | 頻度 | 時間/回 | 合計/月 |
|------|------|---------|---------|
| スモークテスト | 20回/月 | 3分 | 60分 |
| フルテスト（手動） | 5回/月 | 45分 | 225分 |
| **合計** | - | - | **285分/月** |

GitHub Actions 無料枠: **2,000分/月** → 余裕あり ✅

---

## ラベル一覧

| ラベル | 効果 |
|--------|------|
| `run-e2e` | フルテストを実行 |
| `ci:skip` | 全CIをスキップ（未実装） |

---

## 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [GitHub Actions 無料枠](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
