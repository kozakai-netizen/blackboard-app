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

## 最終更新
- 日時: 2025-10-02
- 状態: Week 1完了、ローカル起動確認済み
- 次回: テスト環境の認証情報設定から再開
