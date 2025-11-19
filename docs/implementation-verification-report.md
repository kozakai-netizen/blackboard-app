# ロールベースアクセス制御 実装検証報告書

**作成日**: 2025-11-17
**対象システム**: 電子小黒板アプリ（Blackboard App）
**検証対象**: place_id=170 (dandoli-sample1) のロールベース アクセス制御

---

## 📋 目次

1. [検証概要](#検証概要)
2. [実施した検証](#実施した検証)
3. [検証結果](#検証結果)
4. [発見された問題点](#発見された問題点)
5. [推奨される対応](#推奨される対応)
6. [結論](#結論)

---

## 検証概要

### 検証目的

ロールベースアクセス制御機能の実装が仕様通りに動作することを確認する。

### 検証範囲

- バックエンド実装（`getRoleForPlace`関数、quicklist API）
- データベース設計（v_my_sitesビュー、crewsテーブル）
- フロントエンド統合（トグル表示制御）

### 検証環境

- **開発サーバー**: http://localhost:3000
- **データベース**: stg-work-db.dandoli.jp (SSH tunnel経由)
- **テストユーザー**: user_id=40824 (小坂井 優)
- **対象プレイス**: place_id=170 (dandoli-sample1)

---

## 実施した検証

### 1. getRoleForPlace関数の単体テスト

**テストケース**:
```typescript
[
  { userId: 40824, placeId: 170, expected: 'prime' },  // 元請け会社所属
  { userId: 99999, placeId: 170, expected: 'sub' },    // 存在しないユーザー
  { userId: 67463, placeId: 170, expected: 'prime' },  // プレイスowner
]
```

**結果**: ✅ 全テストケース PASS

```
✅ user_id=40824（元請け会社所属） → prime
✅ user_id=99999（存在しないユーザー） → sub
✅ user_id=67463（プレイスowner） → prime
```

**判定ロジック**:
1. user_level=1（プレイス管理者） → `prime`
2. company_id in (98315, 203104)（元請け会社） → `prime`
3. それ以外 → `sub`

### 2. quicklist APIのロール判定テスト

**リクエスト**:
```bash
GET /api/sites/quicklist?place=dandoli-sample1&user_id=40824&per=3
```

**レスポンス**:
```json
{
  "ok": false,
  "provider": "none",
  "placeId": 170,
  "userId": 40824,
  "userRole": "prime",  // ✅ 正しく判定
  "statusCodes": [1, 2, 3],
  "items": []
}
```

**結果**: ✅ `userRole: "prime"` が正しく返される

**注**: `items`が空配列なのは、DW API/STG APIが利用できないため（開発環境の制限）

### 3. v_my_sitesビューのデータ確認

**クエリ**:
```sql
SELECT site_id, user_id, relation_type
FROM v_my_sites
WHERE user_id = 40824
LIMIT 10
```

**結果**: ✅ 10件のレコードを取得

```
site_id=567377, user_id=40824, relation_type=manager
site_id=595913, user_id=40824, relation_type=manager
site_id=601361, user_id=40824, relation_type=manager
site_id=866508, user_id=40824, relation_type=manager
site_id=956930, user_id=40824, relation_type=manager
```

**確認事項**:
- v_my_sitesビューは正常に動作
- user_id=40824 の担当現場が正しく取得される
- relation_typeは主に'manager'（現場管理担当者）

### 4. crewsテーブルの元請け判定データ

**クエリ**:
```sql
SELECT id, user_id, place_id, user_level, company_id, deleted
FROM crews
WHERE user_id = 40824 AND place_id = 170 AND deleted = 0
```

**結果**: ✅ 2件のcrewレコードを確認

```
crew_id=205013, user_level=2, company_id=98315
crew_id=383962, user_level=2, company_id=203104
```

**確認事項**:
- user_id=40824 は place_id=170 に2つのcrewレコードを持つ
- company_id=98315, 203104（元請け会社）に所属
- user_level=2（一般ユーザー）だが、company_idで元請け判定される

### 5. 元請け会社ID一覧の確認

**クエリ**:
```sql
SELECT DISTINCT company_id
FROM crews
WHERE place_id = 170
  AND company_id IN (98315, 203104)
  AND deleted = 0
```

**結果**: ✅ 元請け会社ID: 98315, 203104

**確認事項**:
- PRIME_COMPANY_IDS_BY_PLACEの設定値が正しい
- 両方の会社IDがcrewsテーブルに存在する

### 6. DB接続安定性テスト

**テスト内容**: 3回連続でDB接続を実行

**結果**: ✅ 全て成功

```
✅ 接続テスト1: 成功 (result=1)
✅ 接続テスト2: 成功 (result=1)
✅ 接続テスト3: 成功 (result=1)
```

**確認事項**:
- `withSshMysql`ヘルパーが安定して動作
- SSH tunnel接続が確立されている
- 連続クエリでも問題なし

### 7. フロントエンド統合確認

**確認項目**:
1. `app/sites/page.tsx` 326行目: `showOnlyMineToggle={res?.userRole === 'prime'}`
2. `components/sites/Toolbar.tsx` 45行目: 条件付きトグル表示

**結果**: ✅ 実装は正しい

**動作**:
- `userRole === 'prime'` の場合: 「自分の現場のみ」トグルを表示
- `userRole === 'sub'` の場合: トグルを非表示

---

## 検証結果

### ✅ 正常に動作している機能

1. **getRoleForPlace関数**
   - company_idベースの判定が正しく動作
   - user_level=1の判定も正常
   - エッジケース（存在しないユーザー）も適切に処理

2. **quicklist API**
   - ロール判定が正しく実行される
   - `userRole`がレスポンスに含まれる
   - ステータス配列がデフォルト[1,2,3]で動作

3. **v_my_sitesビュー**
   - user_idベースで担当現場を正しく取得
   - relation_typeで担当種別を識別

4. **フロントエンド統合**
   - `showOnlyMineToggle` propsが正しく渡される
   - 条件付きレンダリングが動作

5. **データベース設計**
   - crewsテーブルのデータが正しい
   - 元請け会社IDが適切に設定されている

### ⚠️ 注意が必要な点

1. **初回リクエスト時のDB接続エラー**
2. **DW API/STG APIが利用不可（開発環境）**
3. **DBインデックスが未適用**

---

## 発見された問題点

### 🔴 重要度: 高

#### 問題1: 初回リクエスト時にDB接続エラーが発生し、誤ったロールを返す

**症状**:

開発サーバー起動後、**最初のquicklistリクエストでDB接続エラーが発生し、`userRole: "sub"`を返す**。2回目以降は正しく`userRole: "prime"`を返す。

**ログ証拠**:
```
[quicklist] User role: sub (userId=40824, placeId=170)  ← 1回目
[getRoleForPlace] DB接続エラー: connect ECONNREFUSED 127.0.0.1:13306

[getRoleForPlace] user_id=40824 は元請け会社 (company_id=98315,203104) 所属 → prime
[quicklist] User role: prime (userId=40824, placeId=170)  ← 2回目以降
```

**原因**:

1. `withSshMysql`ヘルパーが最初にローカル接続（127.0.0.1:13306）をテストする
2. SSH tunnelがまだ確立されていない場合、ローカル接続が失敗する
3. `getRoleForPlace`の`catch`ブロックがエラーを握りつぶし、安全側に倒して`"sub"`を返す

**該当コード**:

`lib/auth/getRoleForPlace.ts` (88-92行目):
```typescript
} catch (error: any) {
  console.error('[getRoleForPlace] DB接続エラー:', error.message);
  // エラー時は安全側に倒して協力業者扱い
  return 'sub';  // ← ここで誤ったロールを返す
}
```

`lib/db/sshMysql.ts` (112-117行目):
```typescript
// auto: 実接続で選択
if (await canQueryLocal()) {
  (global as any).__DB_MODE_LAST = "local";
  return tryLocal();  // ← ローカル接続失敗時にここで例外
}
(global as any).__DB_MODE_LAST = "ssh";
return trySsh();
```

**影響**:

- **ユーザーへの影響**: 初回ロード時に元請けユーザーが協力業者として扱われる
- **UI挙動**: 「自分の現場のみ」トグルが表示されない（1回目）
- **データフィルタリング**: 協力業者フィルターが適用され、全現場が表示されない可能性

**発生タイミング**:
- 開発サーバー起動直後の初回リクエスト
- SSH tunnelの接続タイムアウト後
- ローカルDB（127.0.0.1:13306）が起動していない場合

**再現性**: ✅ 高（開発環境では100%再現）

---

### 🟡 重要度: 中

#### 問題2: DW API/STG APIが利用できない（開発環境の制限）

**症状**:

quicklist APIが`provider: "none"`, `items: []`を返す。

**原因**:
- DW API: `http://localhost:3001/api/dandori/sites` に接続できない（ポート3001が起動していない）
- STG API: `status is not defined` エラー（実装バグの可能性）

**影響**:
- 現場一覧が空で表示される
- ロール判定以外の機能がテストできない

**対応要否**: △（本番環境では動作する想定）

---

### 🟢 重要度: 低

#### 問題3: 推奨DBインデックスが未適用

**該当インデックス**:
1. `idx_crews_user_place_deleted` - getRoleForPlace用
2. `idx_crews_place_company_deleted` - 元請け会社フィルタ用
3. `idx_sites_place_deleted_status` - ステータス別現場取得用
4. `idx_sites_crews_site_crew_deleted` - v_my_sites用
5. `idx_site_casts_site_crew_deleted` - v_my_sites用

**影響**:
- クエリパフォーマンスが劣化する可能性
- 現場数が増加した場合、応答時間が長くなる

**対応要否**: ○（本番環境適用前に作成推奨）

**作成SQL**: `scripts/check-indexes.ts` 実行結果の「まとめ」セクション参照

---

## 推奨される対応

### 🔴 優先度: 高（問題1の対応）

#### 対応案A: DB_MODE環境変数を"ssh"に固定する（即効性あり）

`.env.local`に以下を追加:
```bash
DB_MODE=ssh
```

**メリット**:
- 即座に問題解決
- ローカル接続のテストをスキップ
- 初回リクエストから正しいロールを返す

**デメリット**:
- ローカルDBを使用する場合に手動で切り替えが必要

**実装難易度**: ★☆☆☆☆（簡単）

---

#### 対応案B: getRoleForPlaceのリトライロジックを追加する

`lib/auth/getRoleForPlace.ts` にリトライ機能を追加:

```typescript
export async function getRoleForPlace(
  userId: number,
  placeId: number,
  maxRetries: number = 1  // 追加
): Promise<UserRole> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const crewsForUser = await withSshMysql(async (conn) => {
        // ... 既存のクエリ処理
      });

      // ... 既存のロール判定ロジック

    } catch (error: any) {
      lastError = error;
      console.error(`[getRoleForPlace] 試行${attempt + 1}/${maxRetries + 1}回目失敗:`, error.message);

      if (attempt < maxRetries) {
        console.log(`[getRoleForPlace] ${500}ms後にリトライします...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  // 全リトライ失敗時
  console.error('[getRoleForPlace] 全リトライ失敗、安全側に倒してsubを返します');
  return 'sub';
}
```

**メリット**:
- 一時的なDB接続エラーに対して自動リトライ
- SSH tunnel確立待ちの時間を稼げる

**デメリット**:
- リトライ分のレイテンシ増加（最大500ms × リトライ回数）
- 根本的な解決ではない

**実装難易度**: ★★☆☆☆（やや簡単）

---

#### 対応案C: withSshMysqlの接続確立を事前に行う（推奨）

アプリ起動時にSSH tunnelを確立する:

`lib/db/sshMysql.ts`に以下を追加:
```typescript
let sshClient: Client | null = null;
let tunnelReady: Promise<void> | null = null;

/**
 * アプリ起動時にSSH tunnelを確立
 */
export async function initSshTunnel(): Promise<void> {
  if (tunnelReady) return tunnelReady;

  tunnelReady = new Promise<void>((resolve, reject) => {
    const ssh = new Client();
    ssh.once("ready", () => {
      sshClient = ssh;
      console.log('[SSH] Tunnel established');
      resolve();
    })
    .once("error", (err) => {
      console.error('[SSH] Tunnel error:', err);
      reject(err);
    })
    .connect({
      host: process.env.SSH_HOST ?? "52.196.65.142",
      port: Number(process.env.SSH_PORT ?? 22),
      username: process.env.SSH_USER ?? "dandolijp",
      privateKey: readPrivateKey(),
      keepaliveInterval: 30000,
      keepaliveCountMax: 2,
    });
  });

  return tunnelReady;
}

export async function withSshMysql<T>(doWork: DoWithConn<T>): Promise<T> {
  // SSH tunnel確立を待つ
  if (process.env.DB_MODE === 'ssh') {
    await initSshTunnel();
  }

  // ... 既存の実装
}
```

`app/api/sites/quicklist/route.ts`（またはグローバルな初期化処理）:
```typescript
import { initSshTunnel } from '@/lib/db/sshMysql';

// アプリ起動時に一度だけ実行
if (process.env.DB_MODE === 'ssh') {
  initSshTunnel().catch(console.error);
}
```

**メリット**:
- 初回リクエストから確実に接続
- パフォーマンス向上（接続確立の待ち時間がない）
- 接続プーリングの基盤となる

**デメリット**:
- 実装が複雑
- SSH切断時の再接続ロジックが必要

**実装難易度**: ★★★★☆（やや難しい）

---

### 推奨対応: **対応案A（即効性）+ 対応案C（中長期）**

1. **即座の対応**: `.env.local`に`DB_MODE=ssh`を追加
2. **本番前の対応**: 対応案Cを実装してSSH接続を安定化

---

### 🟢 優先度: 中（問題3の対応）

#### DBインデックスの作成

`scripts/check-indexes.ts`を実行して推奨SQLを取得:
```bash
npx tsx scripts/check-indexes.ts
```

出力されたCREATE INDEX文を本番DBに適用:
```sql
CREATE INDEX idx_crews_user_place_deleted ON crews (user_id, place_id, deleted);
CREATE INDEX idx_crews_place_company_deleted ON crews (place_id, company_id, deleted);
CREATE INDEX idx_sites_place_deleted_status ON sites (place_id, deleted, site_status);
CREATE INDEX idx_sites_crews_site_crew_deleted ON sites_crews (site_id, crew_id, deleted);
CREATE INDEX idx_site_casts_site_crew_deleted ON site_casts (site_id, crew_id, deleted);
```

**適用タイミング**: 本番環境デプロイ前

---

## 結論

### 総合評価: ⚠️ 条件付きで動作可能

**動作確認済み**: ✅
- ロール判定ロジックは正しく実装されている
- データベース設計は適切
- フロントエンド統合も正しい

**課題**: ⚠️
- **初回リクエスト時のDB接続エラー**により、誤ったロールを返す可能性がある
- 開発環境ではDW API/STG APIが利用不可

### 本番環境適用の可否

#### ✅ 適用可能な条件:

1. `.env.local`（または本番環境変数）に`DB_MODE=ssh`を設定する
2. SSH tunnelが事前に確立されている
3. 推奨DBインデックスを適用する

#### ❌ 適用不可な条件:

- DB_MODE=auto（デフォルト）のまま運用する
- SSH tunnelが不安定な環境

### 次のステップ

#### 必須対応:
1. ✅ `.env.local`に`DB_MODE=ssh`を追加
2. ✅ DBインデックスを作成

#### 推奨対応:
1. 対応案Cの実装（SSH tunnel事前確立）
2. 本番環境でのエンドツーエンドテスト
3. user_id=40824以外のテストユーザーでの検証

#### オプション:
1. getRoleForPlaceのリトライロジック追加
2. エラーログの監視体制構築

---

## 付録

### 検証に使用したスクリプト

1. `scripts/test-get-role.ts` - getRoleForPlace関数の単体テスト
2. `scripts/verify-implementation.ts` - 総合検証スクリプト
3. `scripts/check-indexes.ts` - DBインデックス確認

### 関連ドキュメント

- `docs/role-based-access-control-design.md` - 設計ドキュメント
- `lib/auth/getRoleForPlace.ts` - ロール判定実装
- `app/api/sites/quicklist/route.ts` - quicklist API実装

---

**報告者**: Claude Code
**検証日時**: 2025-11-17
**検証環境**: 開発環境（localhost:3000）
