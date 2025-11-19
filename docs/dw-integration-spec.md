# ダンドリワーク（DW）連携仕様書

**バージョン**: v1.0.0
**最終更新**: 2025-11-19
**対象環境**: 開発環境（STG DB）

---

## 目次

1. [対象プレイス情報](#対象プレイス情報)
2. [ロール判定仕様（prime / sub）](#ロール判定仕様prime--sub)
3. [担当現場判定仕様](#担当現場判定仕様)
4. [v_my_sites ビューの仕様](#v_my_sites-ビューの仕様)
5. [GET /api/sites/quicklist の仕様](#get-apisitesquicklist-の仕様)
6. [フロントエンド側のロジック](#フロントエンド側のロジック)
7. [開発モード（DEV MODE）の仕様](#開発モードdev-modeの仕様)
8. [環境構築・SSH トンネル](#環境構築ssh-トンネル)
9. [既知の制約・注意点](#既知の制約注意点)

---

## 対象プレイス情報

### プレイス基本情報

| 項目 | 値 |
|------|------|
| **place_id** | `170` |
| **place_code** | `dandoli-sample1` |
| **元請け会社ID** | `98315`, `203104` |

### データソース

- **主データソース**: ダンドリワークAPI（DW API）
- **フォールバック**: STG DB（SSH トンネル経由）

---

## ロール判定仕様（prime / sub）

### 概要

ユーザーの`crews`テーブルのレコードから、プレイスにおけるロールを判定します。

**判定結果**:
- `prime`: 元請け
- `sub`: 協力業者
- `unknown`: DB接続エラー

### 判定ロジック

**実装場所**: `lib/auth/getRoleForPlace.ts`

**判定フロー**:

```
1. crews テーブルから user_id, place_id でレコード取得
   ↓
2. レコード数が 0件 → sub（プレイスに所属していない）
   ↓
3. company_id を元請けリスト [98315, 203104] と照合
   ↓
4. 協力業者 company_id を1つでも持つ → sub（優先）
   ↓
5. 純粋に元請け company_id のみ → prime
   ↓
6. company_id が null またはリスト外 → sub
```

### 重要ポイント

#### **協力業者優先ルール**

```typescript
// ❌ 間違った理解
「元請け company_id を持っていれば prime」

// ✅ 正しい理解
「協力業者 company_id を1つでも持っていれば sub」
```

**理由**: DWの業者管理ロール・代理管理などにより、協力業者が元請け`company_id`にも紐づくケースがあるため、「協力業者 company_id を1つでも持てば sub」とする。

#### **1次下請け / 2次下請け（孫請け）の扱い**

**すべて `sub` として扱います。**

- 1次下請け: `sub`
- 2次下請け（孫請け）: `sub`
- さらに下層: `sub`

### 実装コード抜粋

```typescript
// lib/auth/getRoleForPlace.ts
const PRIME_COMPANY_IDS_BY_PLACE: Record<number, number[]> = {
  170: [98315, 203104], // place_id=170（dandoli-sample1）の元請け会社
};

// 協力業者 company_id を持つレコードを分類
const hasSubCompany = crewsForUser.some(c =>
  c.company_id !== null && !primeCompanyIds.includes(c.company_id)
);

// 判定ルール: 協力業者 company_id を1つでも持っていれば協力業者扱い
if (hasSubCompany) {
  return 'sub';
}

// 純粋に元請け company_id だけを持つ場合 → 元請け
if (hasPrimeCompany) {
  return 'prime';
}

// company_id が null の場合や、元請けリストが空の場合 → 協力業者
return 'sub';
```

### エラー時の挙動

**DB接続エラー時**: `unknown` を返し、APIレベルで500エラーとして扱う。

```typescript
// app/api/sites/quicklist/route.ts
if (userRole === 'unknown') {
  return NextResponse.json({
    ok: false,
    error: 'role_determination_failed',
    message: 'ユーザーロールの判定に失敗しました。データベース接続を確認してください。',
    userId,
    placeId,
    userRole: 'unknown'
  }, { status: 500 });
}
```

---

## 担当現場判定仕様

### 概要

「担当現場」とは、以下のいずれかに該当する現場を指します:

1. **現場管理担当者** (`manager`)
2. **役割担当者** (`casts`)
3. **現場参加ユーザー** (`crews`)

### データソース統合

複数のテーブルを統合して、「現場×ユーザー」の関連情報を一元管理します。

**統合元テーブル**:

| テーブル | 役割 | relation_type |
|----------|------|---------------|
| `v_managers` | 現場管理担当者 | `manager` |
| `site_casts` | 役割担当者 | `cast` |
| `sites_crews` | 現場参加ユーザー | `crew` |

### v_my_sites ビューの役割

これらのテーブルを`UNION ALL`で統合し、「user_id がどの site_id に関連しているか」を高速に検索できるようにします。

---

## v_my_sites ビューの仕様

### CREATE VIEW SQL

**実装場所**: `database/views/v_my_sites.sql`

```sql
CREATE OR REPLACE VIEW v_my_sites AS
-- 現場管理担当者（manager, sub_adminなど）
SELECT
  s.id AS site_id,
  COALESCE(s.manager_admin, s.manager_sub_admin1, s.manager_sub_admin2, s.manager_sub_admin3) AS user_id,
  'manager' AS relation_type
FROM sites s
WHERE s.deleted = 0
  AND COALESCE(s.manager_admin, s.manager_sub_admin1, s.manager_sub_admin2, s.manager_sub_admin3) IS NOT NULL

UNION ALL

-- 役割担当者（site_casts）
SELECT
  sc.site_id AS site_id,
  sc.cast AS user_id,
  'cast' AS relation_type
FROM site_casts sc
JOIN sites s ON sc.site_id = s.id
WHERE s.deleted = 0
  AND sc.cast IS NOT NULL

UNION ALL

-- 現場参加ユーザー（sites_crews）
SELECT
  scr.site_id AS site_id,
  scr.worker AS user_id,
  'crew' AS relation_type
FROM sites_crews scr
JOIN sites s ON scr.site_id = s.id
WHERE s.deleted = 0
  AND scr.worker IS NOT NULL;
```

### フィールド定義

| カラム | 型 | 説明 |
|--------|------|------|
| `site_id` | INT | 現場ID |
| `user_id` | INT | ユーザーID |
| `relation_type` | VARCHAR | 関連種別（`manager` / `cast` / `crew`） |

### インデックス推奨

```sql
-- 高速検索のための複合インデックス
CREATE INDEX idx_v_my_sites_user_site ON v_my_sites (user_id, site_id);
CREATE INDEX idx_v_my_sites_site ON v_my_sites (site_id);
```

### 使用例

```sql
-- user_id=40364 が担当している現場を取得
SELECT DISTINCT site_id
FROM v_my_sites
WHERE user_id = 40364;

-- site_id IN (127083, 127084) に関連するユーザーを取得
SELECT site_id, user_id, relation_type
FROM v_my_sites
WHERE site_id IN (127083, 127084);
```

---

## GET /api/sites/quicklist の仕様

### エンドポイント

```
GET /api/sites/quicklist
```

### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|------------|------|------------|------|
| `q` | string | `""` | キーワード検索（現場名・住所など） |
| `per` | number | `50` | 取得件数上限（最大80） |
| `place` | string | `dandoli-sample1` | プレイスコード |
| `user_id` | number | `40824` | ユーザーID |
| `only` | string | `0` | `0`=全現場, `1`=担当現場のみ（元請けのみ有効） |
| `status` | string | `""` | ステータスコード（カンマ区切り） |

### デフォルトステータス

**未指定時**: `[1, 2, 3]`（現調中（見積未提出）、現調中（見積提出済み）、工事中）

```typescript
const DEFAULT_STATUS_CODES = [1, 2, 3];
```

### ステータスコード対応表

| コード | 名称 |
|--------|------|
| `1` | 現調中（見積未提出） |
| `2` | 現調中（見積提出済み） |
| `3` | 工事中 |
| `5` | 完工 |
| `9` | アフター |
| `-1` | 中止・他決 |

### レスポンス形式

```typescript
{
  ok: boolean,
  provider: "dandori" | "stg" | "none",
  place: string,
  placeId: number,
  userId: number,
  userRole: "prime" | "sub" | "unknown",
  statusCodes: number[],
  total: number,
  items: Site[],
  error?: string,
  dbWarning?: boolean, // DB接続エラー時の警告フラグ（元請けのみ）
  timings: {...},
  debug: {...}
}
```

### ロール別の挙動

#### **元請け（prime）の場合**

##### `only=0`（全現場）

1. DW APIから現場一覧を取得
2. ステータスコードでフィルタリング
3. v_my_sitesからmember_keysを付与
4. **フィルタリングなし**で全件返す

```typescript
if (userRole === 'prime') {
  if (onlyMine && !dbError) {
    // only=1 の処理（後述）
  } else {
    // only=0 または DBエラー時は全件返す
    filteredSites = normalized;
  }
}
```

##### `only=1`（担当現場のみ）

1. DW APIから現場一覧を取得
2. v_my_sitesから自分の担当現場IDを取得
3. **担当現場のみ**に絞り込む

```typescript
if (onlyMine && !dbError) {
  const mySiteIds = new Set<string>();
  for (const [siteId, userIds] of userSitesMap.entries()) {
    if (userIds.has(String(userId)) || userIds.has(pad8(String(userId)))) {
      mySiteIds.add(siteId);
    }
  }

  filteredSites = normalized.filter((site: any) => {
    const sid = extractSiteIdFromUrl(site?.url);
    return sid && mySiteIds.has(sid);
  });
}
```

#### **協力業者（sub）の場合**

1. DW APIから現場一覧を取得
2. v_my_sitesから自分の担当現場IDを取得
3. **常に担当現場のみ**に制限（`only`パラメータ無視）

```typescript
if (userRole === 'sub') {
  // DBエラー時は安全側に倒す（0件 + エラーメッセージ）
  if (dbError) {
    return NextResponse.json({
      ok: false,
      error: 'db_connection_failed',
      message: 'データベース接続エラーが発生しました。担当現場情報を取得できません。',
      userId,
      placeId,
      userRole,
      items: [],
      total: 0
    }, { status: 500 });
  }

  const mySiteIds = new Set<string>();
  for (const [siteId, userIds] of userSitesMap.entries()) {
    if (userIds.has(String(userId)) || userIds.has(pad8(String(userId)))) {
      mySiteIds.add(siteId);
    }
  }

  filteredSites = normalized.filter((site: any) => {
    const sid = extractSiteIdFromUrl(site?.url);
    return sid && mySiteIds.has(sid);
  });

  console.log(`[quicklist] 協力業者フィルター適用: ${normalized.length}件 → ${filteredSites.length}件`);
}
```

### エラー時のフォールバック仕様

#### **元請け（prime）の場合**

| エラー種別 | 挙動 |
|------------|------|
| DB接続エラー | 警告フラグ（`dbWarning: true`）を立て、**全件返す** |
| DW API エラー | STG DBにフォールバック |

```typescript
if (dbError) {
  console.warn(`[quicklist] ⚠️ 元請けモード: DB接続エラーですが全件を返します（onlyMineフィルタは動作しません）`);
  hasDbWarning = true;
}
```

#### **協力業者（sub）の場合**

| エラー種別 | 挙動 |
|------------|------|
| DB接続エラー | **500エラー**を返し、0件にする（安全側） |
| DW API エラー | STG DBにフォールバック |

```typescript
if (dbError) {
  console.error(`[quicklist] ❌ 協力業者モード: DB接続エラーのため0件を返します`);
  return NextResponse.json({
    ok: false,
    error: 'db_connection_failed',
    message: 'データベース接続エラーが発生しました。担当現場情報を取得できません。',
    items: [],
    total: 0
  }, { status: 500 });
}
```

---

## フロントエンド側のロジック

### 実装場所

`app/sites/page.tsx`

### ロール別の「自分の現場のみ」トグル表示

```tsx
<Toolbar
  showOnlyMineToggle={res?.userRole === 'prime'} // 元請けのみトグル表示
  // ...
/>
```

**協力業者の場合**: トグルは非表示（API側で常に担当現場のみに制限されるため）

### 二重フィルタリングの回避

**問題**: API側で既に協力業者フィルタを適用しているのに、フロント側で再度フィルタすると0件になる。

**解決**: `isSubUser` フラグで協力業者を判定し、`includesUserLoose`による追加フィルタを**行わない**。

```typescript
// app/sites/page.tsx:290-291
const isSubUser = sessionUser?.userRole === 'sub';

// 307-318行目: フィルタリングロジック
if (!isSubUser && onlyMine) {
  // 元請けの場合のみ、keySetでフィルタ
  if (keySet.size === 0) {
    return false;
  }
  if (!includesUserLoose(site, keySet)) {
    return false;
  }
}
// 協力業者の場合は、このブロックをスキップ
```

**重要**: `isSubUser && onlyMine` の場合は何もしない（APIが既にフィルタ済み）。

---

## 開発モード（DEV MODE）の仕様

### 概要

開発環境で `?role=prime` または `?role=sub` をURLに付けることで、**ログインスキップ**して固定ユーザーでアクセスできます。

### 環境変数

`.env.local`に以下を設定:

```bash
NEXT_PUBLIC_DEBUG_FIXED_PLACE_ID=170
NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME=40824
NEXT_PUBLIC_DEBUG_FIXED_USER_ID_SUB=40364
```

### 使用例

| URL | ユーザー | ロール |
|-----|----------|--------|
| `http://localhost:3001/sites?role=prime&only=0` | 40824 | 元請け・全現場 |
| `http://localhost:3001/sites?role=prime&only=1` | 40824 | 元請け・担当現場のみ |
| `http://localhost:3001/sites?role=sub&only=0` | 40364 | 協力業者（常に担当現場のみ） |

### 実装コード

```typescript
// app/sites/page.tsx:104-132
const devRole = search?.get("role"); // "prime" or "sub"
const isDev = process.env.NODE_ENV === 'development';

useEffect(() => {
  (async () => {
    if (isDev && devRole && (devRole === 'prime' || devRole === 'sub')) {
      const debugUserId = devRole === 'prime'
        ? Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_USER_ID_PRIME || 40824)
        : Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_USER_ID_SUB || 40364);
      const debugPlaceId = Number(process.env.NEXT_PUBLIC_DEBUG_FIXED_PLACE_ID || 170);

      console.log(`🔧 [DEV MODE] ログインスキップ: role=${devRole}, userId=${debugUserId}, placeId=${debugPlaceId}`);

      const user = {
        userId: debugUserId,
        placeId: debugPlaceId,
        userRole: devRole,
        isDebugMode: true
      };

      setSessionUser(user);
      setSessionLoading(false);
      return;
    }

    // 通常のセッション取得処理...
  })();
}, [router, isDev, devRole]);
```

---

## 環境構築・SSH トンネル

### 開発サーバーの起動

```bash
# 方法1: SSHトンネル + Next.js（推奨）
npm run dev:stg

# 内部処理:
# - SSH tunnel: localhost:13306 → stg-work-db.dandoli.jp:3306
# - Next.js: http://localhost:3001
```

### SSH トンネル詳細

**実装**: `scripts/tunnel-stg.js`

```bash
ssh -i ~/.ssh/dandoli_bastion \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=no \
    -o PubkeyAcceptedAlgorithms=+ssh-rsa \
    -o HostkeyAlgorithms=+ssh-rsa \
    -N \
    -L 13306:stg-work-db.dandoli.jp:3306 \
    dandolijp@52.196.65.142
```

### ポート構成

| ポート | 用途 |
|--------|------|
| `3001` | Next.js（開発サーバー） |
| `13306` | SSHトンネル（STG DB） |

### DW API プロキシ

**ベースURL**: `http://localhost:3001`（開発環境）

**プロキシ先**: `https://api.dandoli.jp/api`

---

## 既知の制約・注意点

### 1. 開発環境で初回 404 が出やすい

**原因**: Next.js 15のFast Refresh問題

**対処**:
1. ブラウザをリロード（F5）
2. `.next` フォルダ削除 + サーバー再起動

```bash
rm -rf .next && PORT=3001 npm run dev:stg
```

### 2. レスポンス速度の課題

**現状**: 6〜8秒程度（DW API 2.5秒 + DB 2.5秒 + 処理時間）

**改善候補**:
- DW API のタイムアウト短縮
- キャッシュ戦略の見直し
- v_my_sites のインデックス最適化

### 3. ログインUI

**現状**: シンプルな白背景デザイン（暫定）

**クイックログインボタン**:
- 元請け: `kozakai@dandoli-works.com` / `00000507`
- 協力業者: `dan` / `00000507`

### 4. user_id のパディング問題

**ゼロ埋め8桁対応**:

```typescript
const pad8 = (s: string) => (s || '').padStart(8, '0');

// 検索時は両方のフォーマットでチェック
if (userIds.has(String(userId)) || userIds.has(pad8(String(userId)))) {
  mySiteIds.add(siteId);
}
```

### 5. ポート3000とポート3001の違い

**重要**: ポート3000はSSHトンネルを持たないため、DB接続エラーになります。

**正しい起動方法**: `npm run dev:stg`（ポート3001）

---

## 関連ドキュメント

- **トラブルシューティング**: [docs/dw-integration-troubleshooting.md](./dw-integration-troubleshooting.md)
- **変更履歴**: [docs/changelog.md](./changelog.md)
- **データベースビュー**: [database/views/v_my_sites.sql](../database/views/v_my_sites.sql)

---

**最終更新日**: 2025-11-19
