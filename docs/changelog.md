# 変更履歴（Changelog）

## v1.0.0 - DW連携実装完了 (2025-11-19)

### 🎉 追加された機能

#### ロール判定機能
- **元請け / 協力業者の自動判定** (`lib/auth/getRoleForPlace.ts`)
  - `crews` テーブルの `company_id` から判定
  - 協力業者 `company_id` を1つでも持っていれば協力業者優先
  - 1次下請け・2次下請け（孫請け）もすべて `sub` として扱う
  - DB接続エラー時は `unknown` を返し、500エラーとして扱う

#### v_my_sites ビュー
- **担当現場の統合ビュー** (`database/views/v_my_sites.sql`)
  - `v_managers` / `site_casts` / `sites_crews` を UNION ALL
  - 現場管理担当者 / 役割担当者 / 参加ユーザーを一元管理
  - `relation_type`（`manager` / `cast` / `crew`）で種別を識別

#### quicklist API 改修
- **ロールベースのフィルタリング** (`app/api/sites/quicklist/route.ts`)
  - **元請け**: `only=0` で全現場、`only=1` で担当現場のみ
  - **協力業者**: 常に担当現場のみ（`only` パラメータ無視）
  - v_my_sites を使った高速な担当現場判定
  - ステータス配列のデフォルト値: `[1, 2, 3]`（現調中・工事中）
  - DW API 404/500 時の自動リトライ（800ms 待機）
  - STG DB へのフォールバック機能

#### フロントエンド機能
- **協力業者の二重フィルタ回避** (`app/sites/page.tsx`)
  - `isSubUser` フラグで協力業者を判定
  - 協力業者の場合、`includesUserLoose` による追加フィルタをスキップ
  - 元請けの場合のみ「自分の現場のみ」トグルを表示

#### 開発モード（DEV MODE）
- **ログインスキップ機能** (`app/sites/page.tsx`)
  - `?role=prime` または `?role=sub` で固定ユーザーに切り替え
  - 環境変数でユーザーIDを設定:
    - `NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME=40824`
    - `NEXT_PUBLIC_DEBUG_FIXED_USER_ID_SUB=40364`
    - `NEXT_PUBLIC_DEBUG_FIXED_PLACE_ID=170`

#### ログイン画面
- **クイックログインボタン** (`app/login/page.tsx`)
  - 元請けユーザーと協力業者ユーザーのワンクリックログイン
  - シンプルな白背景デザイン

### 🐛 修正された不具合

#### 協力業者で0件表示問題
- **症状**: API は 15件返しているのに、フロント側で 0件
- **原因**: API側でフィルタ済みなのに、フロント側で再フィルタ
- **修正**: `isSubUser` 判定を追加し、協力業者は追加フィルタをスキップ

#### 40364が元請けと誤判定される問題
- **症状**: user_id=40364 が `prime` と判定される
- **原因**: 「元請け company_id を持っていれば prime」という誤ったロジック
- **修正**: 「協力業者 company_id を1つでも持っていれば sub」に変更

#### SSH/DBエラー時の挙動
- **元請け**: DB接続エラー時も全件を返す（`dbWarning: true` フラグ）
- **協力業者**: DB接続エラー時は 500エラーで0件を返す（安全側）

#### useQueryBool の SSR エラー
- **症状**: `__webpack_require__.n is not a function`
- **原因**: useState の初期化時に `window` オブジェクトにアクセス
- **修正**: useEffect 内で初期化するように変更

#### 環境変数が読めない問題
- **症状**: クライアントサイドで `process.env.DEBUG_*` が `undefined`
- **原因**: `NEXT_PUBLIC_` プレフィックスがない
- **修正**: すべてのクライアント用環境変数に `NEXT_PUBLIC_` を追加

#### ポート3000とポート3001の混同
- **症状**: `ERR_CONNECTION_REFUSED` または DB接続エラー
- **原因**: ポート3000はSSHトンネルを持たない
- **修正**: ドキュメントで `npm run dev:stg`（ポート3001）を推奨

### 📚 ドキュメント追加

- **`docs/dw-integration-spec.md`**: DW連携の詳細仕様書
- **`docs/dw-integration-troubleshooting.md`**: トラブルシューティングガイド
- **`docs/changelog.md`**: この変更履歴ファイル
- **`database/views/v_my_sites.sql`**: v_my_sites ビューの SQL定義

### ⚠️ 未解決だが認識している課題

#### 初回404エラー
- **現象**: 開発環境で初回アクセス時に404が出やすい
- **暫定対処**: ブラウザリロード（F5）または `.next` フォルダ削除
- **原因**: Next.js 15のFast Refresh問題（調査中）

#### レスポンス速度
- **現状**: 6〜8秒程度（DW API 2.5秒 + DB 2.5秒 + 処理時間）
- **改善候補**:
  - DW API のタイムアウト短縮
  - キャッシュ戦略の見直し
  - v_my_sites のインデックス最適化

#### ログインUI
- **現状**: シンプルな白背景デザイン（暫定）
- **将来**: 本格的なUI実装を検討

### 🔧 変更されたファイル

#### 新規作成
- `lib/auth/getRoleForPlace.ts` - ロール判定ロジック
- `database/views/v_my_sites.sql` - 担当現場ビュー
- `docs/dw-integration-spec.md` - 仕様書
- `docs/dw-integration-troubleshooting.md` - トラブルシューティング
- `docs/changelog.md` - 変更履歴

#### 大幅な変更
- `app/api/sites/quicklist/route.ts` - ロールベースフィルタリング実装
- `app/sites/page.tsx` - 開発モード、二重フィルタ回避
- `app/login/page.tsx` - クイックログイン機能

#### 軽微な変更
- `.env.local` - `NEXT_PUBLIC_DEBUG_*` 環境変数追加
- `scripts/tunnel-stg.js` - SSHトンネルスクリプト
- `scripts/check-user-40364.js` - ロール判定検証スクリプト

### 📊 テスト結果

#### 動作確認済み環境
- **元請けユーザー（40824）**:
  - `only=0`: 全現場表示 ✅
  - `only=1`: 担当現場のみ表示 ✅
- **協力業者ユーザー（40364）**:
  - 常に担当現場のみ表示（15件） ✅

#### 確認用URL
- 元請け・全現場: `http://localhost:3001/sites?role=prime&only=0`
- 元請け・担当のみ: `http://localhost:3001/sites?role=prime&only=1`
- 協力業者: `http://localhost:3001/sites?role=sub&only=0`

---

## v1.1.0 - 2025-11-20

### Changed
- /sites 一覧の4ビュー（ギャラリー / カンバン / カード / リスト）のUIをダンドリワーク本番画面のトンマナに合わせて再設計
- 各ビューに「ローカル」「DW」ボタンを共通レイアウトで再配置（ラベルから「〜から」を削除）
- 詳細検索ドロワーを右側スライドイン表示に統一し、一覧側は常に画面全幅＋レスポンシブパディングで表示
- カンバンビューのステータスヘッダーの高さと件数表示を調整し、視認性を向上
- 住所未入力の現場でもカード高さが揃うように調整（ギャラリー / カード / カンバンビュー）

### Not changed
- 元請け / 協力業者のロール判定ロジック
- 「自分の現場のみ」フィルタを含む /api/sites/quicklist のバックエンド仕様
- DW API / STG DB との連携仕様（v1.0.0 のまま）

---

## 今後の予定

### v1.2.0 (予定)
- [ ] レスポンス速度の改善
- [ ] 初回404エラーの根本解決
- [ ] ログインUIの本格実装
- [ ] 本番環境へのデプロイ
- [ ] 複数プレイス対応
- [ ] ロールのキャッシュ機能
- [ ] v_my_sitesのインデックス最適化

---

**最終更新日**: 2025-11-20
