# 電子小黒板アプリ開発ログ

## プロジェクト概要
- Next.js + Supabase
- 電子小黒板の一括登録機能
- 国交省準拠（SHA-256ハッシュ、改ざん検知）
- J-COMSIA認定取得予定

## 開発状況

### Week 1（2025-10-02）✅ 完了
**実施内容：**
- Next.jsプロジェクト作成
- 12個のファイル実装完了
  - types/index.ts
  - lib/supabase.ts, hash.ts, canvas.ts, dandori-api.ts
  - components/FileSelector.tsx, BlackboardForm.tsx, UploadProgress.tsx
  - app/api/dandori/upload/route.ts, sites/route.ts
  - app/upload/page.tsx, page.tsx
  - .env.local
- Supabaseセットアップ完了（manifests bucket作成）
- ローカル起動成功（http://localhost:3002）
- トップページ表示確認

**次のステップ：**
- テスト環境の認証情報設定（DW_BEARER_TOKEN, PLACE_CODE）
- 実際の写真でアップロードテスト
- バグ修正・改善

---

## Day 2（2025-10-03）完了分: 黒板プレビュー機能と個別設定モード実装

### 実装完了内容

#### 1. 黒板プレビュー機能（✅完了）
- `components/BlackboardPreview.tsx` - リアルタイムプレビュー
- `components/PreviewModal.tsx` - 拡大表示モーダル
- クリックで全画面表示、ESCで閉じる

#### 2. モード選択機能（✅完了）
- `components/ModeSelector.tsx`
- 📋 一括設定 / 🔢 個別設定の選択

#### 3. 一括設定モード（✅完了）
- 左側（2カラム）：プレビュー
- 右側（1カラム）：黒板情報入力
- リアルタイムプレビュー更新

#### 4. 個別設定モード（✅完了）
- `components/IndividualMode.tsx`
- 3分割レイアウト（写真一覧・プレビュー・黒板情報）
- 複数枚選択→黒板情報入力→「選択中の○枚に適用」
- プレビュークリックで拡大表示
- 設定済み写真に緑チェックマーク

#### 5. バグ修正（✅完了）
- BlackboardForm.tsx のプレビュー更新バグ修正
- hideSubmitButton props 追加

### 技術的な決定事項
- フローティングボタン案は却下→シンプルな固定ボタンに
- PCブラウザ優先でレイアウト設計
- max-width 1600px（個別設定モードに適用）

### 残課題
- [ ] レスポンシブ対応（スマホ表示の最適化）
- [ ] テスト環境の認証情報設定

### 次回セッション予定（Phase 2）
1. テスト環境の認証情報設定
2. 実際のアップロードテスト
3. ダンドリワーク写真連携

---

## Day 3（2025-10-04）: 現場一覧画面と現場選択フロー実装

### 実装完了内容

#### 1. 現場一覧画面（✅完了）
- `app/sites/page.tsx` - 現場一覧画面
- `components/SiteTable.tsx` - 現場テーブル
- 検索・フィルタ・ソート・ページネーション
- モックデータで動作確認（10件の現場）

#### 2. 正しいユーザーフロー確立（✅完了）
- トップページ → 現場一覧 → 現場選択 → 写真アップロード
- URLパラメータで現場情報引き継ぎ（site_code, place_code）
- 黒板の工事名に現場名を自動入力

#### 3. 個別設定モードの大幅改善（✅完了）
- チェックボックスUI追加（選択/解除が明確に）
- 選択順に番号表示（1, 2, 3...）
- 設定済み写真の再編集機能
- プレビュー表示バグ修正（各写真の設定情報を正しく表示）

#### 4. 撮影日時編集機能（✅完了）
- BlackboardFormに日時入力フィールド追加
- 初期値は現在日時、ユーザーが変更可能
- 撮影日時を遡って変更できる

### 次回実装予定
- [ ] UIタブ切替方式への改善（プレビュー大きく表示）
- [ ] チェックボックスクリック領域の調整
- [ ] 実際のAPI接続テスト（検証環境準備待ち）
- [ ] ダンドリワーク写真連携

### Git履歴

#### Commit 5（2025-10-04）
"Add: 撮影日時編集機能、設定済み写真の再編集機能、プレビュー表示バグ修正、チェックボックスUI追加"

#### Commit 4（2025-10-03）
"Add: 個別設定モード実装 - 写真グループ選択、個別黒板設定、プレビュー拡大機能"

---

## 技術スタック
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Storage)
- Canvas API (画像処理、黒板オーバーレイ)
- SubtleCrypto (SHA-256ハッシュ計算)

## アーキテクチャ
ユーザー
  ↓
Next.jsアプリ（Vercel）
  ├─ フロント: 写真選択、黒板情報入力
  ├─ 画像処理: Canvas API（黒板オーバーレイ、EXIF削除、SHA-256）
  ├─ BFF: Bearer Token秘匿
  └─ manifest.json保存: Supabase Storage
  ↓
ダンドリワークAPI（テスト環境）
  └─ 写真アップロード（10枚チャンク × 並列3）

### ディレクトリ構成
```
blackboard-app/
├── app/
│   ├── api/
│   │   └── dandori/
│   │       ├── upload/route.ts    # アップロードAPI
│   │       └── sites/route.ts     # 現場一覧API
│   ├── upload/
│   │   └── page.tsx               # アップロードページ
│   ├── page.tsx                   # トップページ
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── FileSelector.tsx           # ファイル選択
│   ├── BlackboardForm.tsx         # 黒板情報入力
│   └── UploadProgress.tsx         # 進捗表示
├── lib/
│   ├── supabase.ts               # Supabaseクライアント
│   ├── hash.ts                   # SHA-256ハッシュ
│   ├── canvas.ts                 # 画像処理
│   └── dandori-api.ts            # API連携
├── types/
│   └── index.ts                  # 型定義
└── .env.local                    # 環境変数
```

### データフロー
1. ユーザーが写真を選択
2. Canvas APIで黒板を描画
3. SHA-256ハッシュを計算（原本・加工後）
4. ダンドリワークAPIへアップロード（10枚ずつ、3並列）
5. Supabaseにマニフェストを保存
6. 完了通知

## 環境変数（.env.local）
# ダンドリワークAPI（テスト環境）
NEXT_PUBLIC_DW_API_BASE=https://api.dandoli.jp/co
DW_BEARER_TOKEN=（要設定 - テスト環境用）
NEXT_PUBLIC_PLACE_CODE=（要設定 - テスト環境用）

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jtdgyaldlleueflutjop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（設定済み）
SUPABASE_SERVICE_ROLE_KEY=（設定済み）

## 国交省準拠要件（Phase 1実装済み）
- ✅ SHA-256ハッシュ計算（元画像 + 合成画像）
- ✅ 原本保持（別ファイルとして）
- ✅ EXIF/GPS削除（Canvas描画で自動削除）
- ✅ 黒板オーバーレイ
- ✅ タイムスタンプ記録
- ✅ manifest.json保存（Supabase Storage）
- ⏸️ 電子署名（Phase 2）
- ⏸️ 信憑性チェックツール（Phase 2）

## トラブルシューティング

### API接続エラー (ENOTFOUND api.dandori.work)
- 原因: DW_BEARER_TOKENが未設定または無効
- 解決: .env.localに正しいトークンを設定

### ポート3000が使用中
- 自動的に3002にフォールバック
- 問題なし

## 開発メモ
- ポート3002で起動（3000は使用中）
- 警告: 複数のpackage-lock.json検出（動作には影響なし）
- Backbone.js本体とは独立したNext.jsアプリとして開発

## 連絡事項
- テスト環境の認証情報を取得次第、実際のアップロードテストを実施
- Week 2でバグ修正・改善を進める予定

## 今後の開発予定
- [ ] 実環境テスト
- [ ] エラーハンドリング強化
- [ ] リトライロジック追加
- [ ] マニフェスト閲覧画面
- [ ] J-COMSIA認定申請

---

## Day 6（2025-10-06）最終状態: Netlifyデプロイ準備中

### 実装完了内容（すべて✅）
1. 黒板サイズ修正（画像下部20%、幅80%）
2. 現場一覧検索機能（基本検索+詳細検索の折りたたみ式）
3. UI大幅改善（テーブルデザイン、ボタン、レイアウト）
4. 写真選択フロー簡略化（現場選択後、自動でファイル選択）
5. サムネイルスライダー実装（一括登録モード）
6. GitHubリポジトリ作成・プッシュ完了
7. TypeScriptエラー修正（any型、unused変数、img→Image）
8. Suspense実装完了（useSearchParams対応）

### 現在進行中の問題（✅解決済み）
**Netlifyデプロイエラー：**
- エラー内容：`useSearchParams()` のプリレンダリングエラー
- 解決済み：app/upload/page.tsx にSuspense実装完了

### 解決策（✅実装完了）
app/upload/page.tsx を以下のように修正：
```typescript
import { Suspense } from 'react'

function UploadPageContent() {
  const searchParams = useSearchParams()
  // 既存コード
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <UploadPageContent />
    </Suspense>
  )
}
```

### Netlify環境変数（設定済み）
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_PLACE_CODE

### GitHub情報
- リポジトリ：https://github.com/kozakai-netizen/blackboard-app
- ブランチ：main
- 最新コミット：Suspense実装完了（デプロイ準備完了）

### 次回セッション開始時の手順
1. ✅ Suspense修正を完了
2. ローカルビルド確認：`rm -rf .next && npm run build`
3. エラーがなければ：`git add . && git commit -m "Fix: Suspenseでプリレンダリングエラー解決" && git push`
4. Netlifyで自動デプロイ確認
5. 成功したらスタッフにURL共有

### 技術的メモ
- Next.js 15.5.4 + App Router
- useSearchParams使用時は必ずSuspenseで囲む
- Netlifyは自動デプロイ設定済み（mainブランチへのpush時）

### Git履歴
#### Commit 8（2025-10-06予定）
"Fix: Suspenseでプリレンダリングエラー解決、TypeScriptエラー修正完了"

#### Commit 7（2025-10-06）
"Add: 現場一覧検索機能拡張、UI改善（基本検索+詳細検索、テーブルデザイン統一）、サムネイルスライダー実装"

---

---

## Day 7（2025-10-06）: ダンドリワークAPI連携実装完了

### 実装完了内容（すべて✅）

#### 1. ダンドリワークAPI連携（✅完了）
- **ファイル**: `app/sites/page.tsx`
- **変更内容**: モックデータを削除し、実際のAPI連携に移行
- **取得件数**: 169件の現場データ

#### 2. API仕様の修正（✅完了）
- **問題**: URLパスが `/places/` で404エラー
- **修正**: `/co/places/` に変更
- **ファイル**: `app/api/dandori/sites/route.ts`

#### 3. 環境変数の修正（✅完了）
- **問題**:
  - API URLが `https://api.dandori.work/v1` で接続エラー
  - `place_code` が `'TEST_PLACE_001'` という間違った固定値
- **修正**:
  - `NEXT_PUBLIC_DW_API_BASE=https://api.dandoli.jp/api`
  - `placeCode` を環境変数から取得

#### 4. デバッグログ追加（✅完了）
- console.logで🔵/🔴のアイコン付きログ
- API呼び出しの流れを可視化

### 技術的な詳細

**最終的なAPI URL**:
```
https://api.dandoli.jp/api/co/places/dandoli-sample1/sites
```

**データフロー**:
```
app/sites/page.tsx
  ↓ fetch(/api/dandori/sites?place_code=dandoli-sample1)
app/api/dandori/sites/route.ts
  ↓ fetch(https://api.dandoli.jp/api/co/places/dandoli-sample1/sites)
ダンドリワークAPI
  ↓ 169件の現場データを返却
app/sites/page.tsx
  ↓ データ整形（name → site_name）
SiteTable コンポーネント
  ↓ 画面に現場一覧を表示
```

### Git履歴

#### Commit 9（2025-10-06予定）
"feat: ダンドリワークAPI連携実装完了、モックデータ削除、環境変数修正"

#### 修正ファイル一覧
1. `app/sites/page.tsx` - API連携実装
2. `app/api/dandori/sites/route.ts` - URLパス修正
3. `.env.local` - API URLとplace_code修正
4. `docs/api/dandori-api-spec.md` - API仕様書作成（新規）

### トラブルシューティング履歴

**問題1**: 無限ローディング
- 原因: モックデータのままだった
- 解決: API連携に修正

**問題2**: `place_code is required` エラー
- 原因: クエリパラメータ不足
- 解決: `?place_code=${placeCode}` 追加

**問題3**: `ENOTFOUND api.dandori.work`
- 原因: 間違ったAPI URL
- 解決: `https://api.dandoli.jp/api` に修正

**問題4**: 404エラー
- 原因: URLパスが `/places/`
- 解決: `/co/places/` に修正

### 参照ドキュメント
- API仕様書: `docs/api/dandori-api-spec.md`

---

## 最終更新
- 日時: 2025-10-06 20:30
- 状態: Day 7完了 - ダンドリワークAPI連携実装完了、169件の現場データ表示成功
- 次回: 写真アップロード機能のテスト、エラーハンドリング強化
