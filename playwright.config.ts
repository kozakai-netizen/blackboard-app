import { defineConfig, devices } from '@playwright/test'

/**
 * 環境変数からポートとベースURLを取得
 * CI では必ずランダムポート (PW_PORT) を使用
 */
const PW_PORT = process.env.PW_PORT || '3002'
const PW_BASE_URL = process.env.PW_BASE_URL || `http://localhost:${PW_PORT}`
const PW_WORKERS = parseInt(process.env.PW_WORKERS || '1', 10)

console.log('🔧 [Playwright Config] PW_PORT:', PW_PORT)
console.log('🔧 [Playwright Config] PW_BASE_URL:', PW_BASE_URL)
console.log('🔧 [Playwright Config] PW_WORKERS:', PW_WORKERS)

/**
 * Playwright設定
 * - スモークテスト: @smoke タグのみ、chromium のみ
 * - フルテスト: 全テスト、chromium/webkit/firefox
 */
export default defineConfig({
  testDir: './tests',

  // タイムアウト設定
  timeout: 30000, // 各テストのタイムアウト
  expect: {
    timeout: 5000 // expectのタイムアウト
  },

  // 並列実行制御（環境変数で制御）
  fullyParallel: false,
  workers: Number(process.env.PW_WORKERS ?? 2),

  // リトライ設定（CI のみ1回リトライ）
  retries: process.env.CI ? 1 : 0,

  // レポーター設定（CI/ローカルともに同じ出力を生成）
  reporter: [
    ['line'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ...(process.env.CI ? [['github' as const]] : [])
  ],

  // 共通設定
  use: {
    // 環境変数ベースのベースURL（ハードコード禁止）
    baseURL: PW_BASE_URL,

    // トレース・スクリーンショット・動画は最初のリトライ時のみ（CI効率化）
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // タイムアウト
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  // プロジェクト定義
  projects: [
    {
      name: 'smoke',
      testMatch: /.*\.spec\.ts/,
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'webkit',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'firefox',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] }
    }
  ],

  // 開発サーバー設定（ローカル実行時のみ）
  webServer: process.env.CI ? undefined : {
    command: `npm run dev:stg`,
    url: 'http://localhost:3002',
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
})
