# 電子小黒板アプリ - チャット引き継ぎ情報

## 現在の状況（2025-10-06）
- **プロジェクト名**: blackboard-app
- **プロジェクト場所**: /Users/dw1005/Desktop/blackboard-app
- **開発サーバー**: http://localhost:3002 または 3003
- **Git状態**: mainブランチ、Day 7作業完了

## 環境変数（.env.local）
```
NEXT_PUBLIC_PLACE_CODE=dandoli-sample1
DW_BEARER_TOKEN=4b8dfcab74cc1b3fac4cd523d01ac6a4
NEXT_PUBLIC_DW_API_BASE=https://api.dandoli.jp/api
NEXT_PUBLIC_SUPABASE_URL=https://jtdgyaldlleueflutjop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（設定済み）
SUPABASE_SERVICE_ROLE_KEY=（設定済み）
```

## 完了機能
- ✅ ダンドリワークAPI連携（現場一覧169件取得成功）
- ✅ 開発用ログイン選択画面（/login-dev）
  - 元請: 潟田工務店 - 小坂井 優（userId: 40824）
  - 協力会社: ダン基礎 - 杉田 玄白（userId: 40364）
- ✅ 現場一覧画面（検索・フィルタ機能付き）
- ✅ 写真アップロードAPI基本実装（/api/dandori/site-photos）
- ✅ アップロードページのAPI連携（モックデータ削除）
- ✅ 完了モーダルの「閉じる」ボタン追加

## 未解決の課題
1. ❌ **写真アップロードの500エラー**
   - 症状: ダンドリワークAPIがHTMLエラーを返却
   - 対策: 詳細ログを追加済み（次回デバッグ可能）
   - テストページ: /test-photo-upload

2. ⏸️ **協力会社フィルタリング**
   - 杉田さん（ダン基礎）ログイン時、参画現場のみ表示
   - APIの仕様確認が必要

## 次のタスク（優先順位順）
1. **写真アップロード500エラー解決**
   - コンソールログで詳細エラー確認
   - update_crew パラメータの修正
   - Bearer Token認証の確認

2. **電子小黒板機能の動作確認**
   - 実際の写真でアップロードテスト
   - 黒板オーバーレイ確認
   - SHA-256ハッシュ確認

3. **協力会社フィルタリング実装**
   - APIの仕様確認
   - sessionStorageのuserIdを使用

## 重要ファイル
### API関連
- `app/api/dandori/sites/route.ts` - 現場一覧API
- `app/api/dandori/site-photos/route.ts` - 写真アップロードAPI（詳細ログ追加済み）

### ページ
- `app/login-dev/page.tsx` - ログイン選択画面
- `app/sites/page.tsx` - 現場一覧（API連携済み）
- `app/upload/page.tsx` - アップロードページ（API連携済み）
- `app/test-photo-upload/page.tsx` - テスト用アップロードページ

### コンポーネント
- `components/UploadProgress.tsx` - モーダル（「閉じる」ボタン追加済み）
- `components/SiteTable.tsx` - 現場テーブル

## デバッグ方法
1. ブラウザのコンソールを開く
2. /test-photo-upload にアクセス
3. 現場を選択して写真をアップロード
4. コンソールで以下のログを確認：
   - 📸 Request parameters
   - 📸 Environment check
   - 📸 Response status
   - ❌ API Error（エラー時）

## Git履歴
- 最新コミット: Day 7完了（ログイン選択画面、API連携）
- リポジトリ: https://github.com/kozakai-netizen/blackboard-app

## 技術スタック
- Next.js 15.5.4 + App Router
- TypeScript
- Tailwind CSS
- Supabase Storage
- Canvas API（黒板オーバーレイ）
- SHA-256（改ざん検知）

## 注意事項
- useSearchParams使用時は必ずSuspenseで囲む
- モックデータは使用しない（すべてAPI連携）
- 開発サーバーのポートは自動で変わる可能性あり

---

## 新しいチャット開始時の確認事項
1. CLAUDE.mdで全体の履歴を確認
2. この HANDOVER.md で直近の状況を把握
3. 開発サーバーが起動しているか確認: `npm run dev`
4. ブラウザで http://localhost:3002 または 3003 にアクセス
