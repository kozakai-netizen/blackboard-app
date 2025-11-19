# ロールベースアクセス制御 設計ドキュメント

**作成日**: 2025-11-17
**対象プレイス**: place_id=170 (place_code=dandoli-sample1)
**対象システム**: 電子小黒板アプリ（Blackboard App）

---

## 📋 目次

1. [概要](#概要)
2. [ロール判定ロジック](#ロール判定ロジック)
3. [v_my_sitesビュー設計](#v_my_sitesビュー設計)
4. [quicklist API仕様](#quicklist-api仕様)
5. [フロントエンド実装](#フロントエンド実装)
6. [データベース設計](#データベース設計)
7. [パフォーマンス最適化](#パフォーマンス最適化)

---

## 概要

### 目的

プレイスごとに「元請け」と「協力業者」のロールを判定し、以下の機能を実現する:

1. **元請けアカウント**: 全現場を閲覧可能。「自分の現場のみ」トグルで担当現場に絞り込み可能。
2. **協力業者アカウント**: 担当現場のみ閲覧可能。トグルは非表示。

### 適用範囲

- **プレイス**: place_id=170 (dandoli-sample1) のみ
- **元請け会社**: company_id in (98315, 203104)
- **ユーザー例**: user_id=40824 (小坂井 優) は元請けアカウント

---

## ロール判定ロジック

### 実装場所

`lib/auth/getRoleForPlace.ts`

### 判定フロー

```typescript
function getRoleForPlace(userId: number, placeId: number): Promise<UserRole> {
  // 1. crewsテーブルからuser_id + place_idでレコード取得
  const crewsForUser = SELECT * FROM crews
    WHERE user_id = userId
      AND place_id = placeId
      AND deleted = 0;

  // 2. レコードが0件 → 協力業者扱い
  if (crewsForUser.length === 0) {
    return 'sub';
  }

  // 3. user_level=1 (プレイス管理者) → 元請け
  if (crewsForUser.some(c => c.user_level === 1)) {
    return 'prime';
  }

  // 4. company_idが元請け会社リストに含まれる → 元請け
  const PRIME_COMPANY_IDS = [98315, 203104]; // place_id=170のみ
  if (crewsForUser.some(c => PRIME_COMPANY_IDS.includes(c.company_id))) {
    return 'prime';
  }

  // 5. それ以外 → 協力業者
  return 'sub';
}
```

### ロール定義

| ロール | 値 | 判定条件 | 閲覧可能範囲 | トグル表示 |
|--------|-----|----------|-------------|-----------|
| **元請け** | `"prime"` | `user_level=1` または `company_id in (98315, 203104)` | プレイス全現場 | ✅ 表示 |
| **協力業者** | `"sub"` | 上記以外 | 担当現場のみ | ❌ 非表示 |

---

## v_my_sitesビュー設計

### 目的

ユーザーの「担当現場」を高速に取得するためのビュー。`user_id`ベースで以下の3つのデータソースを統合。

### ビュー定義SQL

```sql
CREATE OR REPLACE VIEW v_my_sites AS
-- 1. 現場管理担当者 (v_managers経由)
SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'manager' AS relation_type
FROM sites s
JOIN v_managers vm ON vm.site_id = s.id
JOIN crews c ON c.id = vm.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND c.deleted = 0

UNION

-- 2. 役割担当者 (site_casts)
SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'cast' AS relation_type
FROM sites s
JOIN site_casts sc ON sc.site_id = s.id
JOIN crews c ON c.id = sc.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND sc.deleted = 0
  AND c.deleted = 0

UNION

-- 3. 現場参加ユーザー (sites_crews)
SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'crew' AS relation_type
FROM sites s
JOIN sites_crews scr ON scr.site_id = s.id
JOIN crews c ON c.id = scr.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND scr.deleted = 0
  AND c.deleted = 0;
```

### データ統計（2025-11-17時点）

- **総レコード数**: 513件
- **ユニーク現場数**: 133現場
- **ユニークユーザー数**: 72名
- **relation_type別**:
  - manager: 289件
  - cast: 74件
  - crew: 150件

### 重複データについて

同一の`(user_id, site_id)`が複数の`relation_type`で登録されている場合あり（例: site_id=567377, user_id=40824 が'manager'と'crew'の両方で登録）。

**影響**: なし。`member_keys`生成時に`Set`構造で自動的に重複除去される。

---

## quicklist API仕様

### エンドポイント

`GET /api/sites/quicklist`

### リクエストパラメータ

| パラメータ | 必須 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| `place` | No | `dandoli-sample1` | プレイスコード |
| `user_id` | No | `40824` | ログインユーザーID |
| `status` | No | (未指定) | ステータス配列（カンマ区切り）。未指定時は`[1,2,3]` |
| `q` | No | `""` | 検索キーワード |
| `per` | No | `50` | 取得件数（最大80件） |

### ステータス配列の仕様

| パラメータ値 | 適用されるステータスコード | 説明 |
|------------|------------------------|------|
| (未指定) | `[1, 2, 3]` | デフォルト3ステータス |
| `all` | `[]` (全件) | 全ステータス |
| `1,2,3` | `[1, 2, 3]` | 指定されたステータスのみ |
| `5` | `[5]` | 完工のみ |

**ステータスコードマッピング**:
- `1`: 現調中（見積未提出）
- `2`: 現調中（見積提出済み）
- `3`: 工事中
- `5`: 完工
- `9`: アフター
- `-1`: 中止・他決

### レスポンス形式

```json
{
  "ok": true,
  "provider": "dandori",
  "place": "dandoli-sample1",
  "placeId": 170,
  "userId": 40824,
  "userRole": "prime",  // "prime" or "sub"
  "statusCodes": [1, 2, 3],
  "total": 42,
  "items": [
    {
      "site_code": "127083",
      "site_name": "山本様邸新築工事",
      "site_type": "新築",
      "status": "工事中",
      "updated_at": "2025-11-01",
      "address": "〇〇県〇〇市...",
      "manager_name": "田中 太郎",
      "manager_id": "12345678",
      "place_code": "dandoli-sample1",
      "member_keys": ["40824", "00040824", "67463", "00067463"]
    }
  ],
  "timings": { ... },
  "debug": { ... }
}
```

### ロールによる挙動の違い

#### 元請け（userRole="prime"）

1. **DW API呼び出し**: プレイス全現場を取得（ステータス条件のみ）
2. **member_keys付与**: v_my_sitesベースで全現場にmember_keysを付与
3. **レスポンス**: 全現場を返す
4. **フロント側フィルター**: `onlyMine`トグルで`includesUserLoose(site, keySet)`により担当現場のみ表示

#### 協力業者（userRole="sub"）

1. **DW API呼び出し**: プレイス全現場を取得（ステータス条件のみ）
2. **member_keys付与**: v_my_sitesベースで全現場にmember_keysを付与
3. **担当現場フィルター**: `member_keys`に`user_id`が含まれる現場のみに制限
4. **レスポンス**: 担当現場のみ返す
5. **フロント側**: トグル非表示、常に担当現場のみ

---

## フロントエンド実装

### トグル表示制御

**実装場所**: `components/sites/Toolbar.tsx`, `app/sites/page.tsx`

```typescript
// Toolbar.tsx
function Toolbar({ showOnlyMineToggle = true, ... }) {
  return (
    <>
      {showOnlyMineToggle && (
        <label>
          <input type="checkbox" checked={onlyMine} onChange={...} />
          自分の現場のみ
        </label>
      )}
    </>
  );
}

// app/sites/page.tsx
<Toolbar
  showOnlyMineToggle={res?.userRole === 'prime'} // 元請けのみ表示
  onlyMine={onlyMine}
  onToggleMine={setOnlyMine}
  ...
/>
```

### 担当現場判定ロジック

**実装場所**: `lib/sites/matchMine.ts`

```typescript
export function includesUserLoose(site: any, keys: Set<string>): boolean {
  if (!keys || keys.size === 0 || !site) return false;

  const cands: any[] = [];

  // quicklist APIで生成された member_keys 配列（最優先）
  if (Array.isArray(site.member_keys)) {
    cands.push(...site.member_keys);
  }

  // DW API原型のフォールバック
  cands.push(site.manager_id);
  cands.push(site.manager?.admin, site.manager?.chief, ...);

  return cands
    .filter(v => v !== null && v !== undefined)
    .some(v => keys.has(String(v)));
}
```

---

## データベース設計

### 主要テーブル

#### 1. crews（ユーザー-プレイス紐付け）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | int | crew_id（PK） |
| user_id | int | ユーザーID |
| place_id | int | プレイスID |
| user_level | int | ユーザーレベル（1=管理者、2=一般、3=閲覧のみ） |
| company_id | int | 会社ID |
| deleted | tinyint | 削除フラグ |

#### 2. sites（現場マスタ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | int | site_id（PK） |
| place_id | int | プレイスID |
| name | varchar | 現場名 |
| site_status | int | ステータスコード |
| deleted | tinyint | 削除フラグ |

#### 3. sites_crews（現場参加ユーザー）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | int | PK |
| site_id | int | 現場ID |
| crew_id | int | ユーザーID（crews.id） |
| user_level | int | 権限レベル |
| deleted | tinyint | 削除フラグ |

#### 4. site_casts（役割担当者）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | int | PK |
| site_id | int | 現場ID |
| crew_id | int | ユーザーID（crews.id） |
| cast_id | int | 役割ID |
| deleted | tinyint | 削除フラグ |

---

## パフォーマンス最適化

### 推奨インデックス

以下のインデックスを作成することで、クエリパフォーマンスが大幅に向上します。

```sql
-- 1. getRoleForPlace関数用（user_id + place_id での高速検索）
CREATE INDEX idx_crews_user_place_deleted ON crews (user_id, place_id, deleted);

-- 2. 元請け会社フィルタリング用
CREATE INDEX idx_crews_place_company_deleted ON crews (place_id, company_id, deleted);

-- 3. quicklist APIでのステータス別現場取得
CREATE INDEX idx_sites_place_deleted_status ON sites (place_id, deleted, site_status);

-- 4. v_my_sitesビュー用（sites_crews）
CREATE INDEX idx_sites_crews_site_crew_deleted ON sites_crews (site_id, crew_id, deleted);

-- 5. v_my_sitesビュー用（site_casts）
CREATE INDEX idx_site_casts_site_crew_deleted ON site_casts (site_id, crew_id, deleted);
```

### クエリ最適化

- **チャンク処理**: site_id検索は500件ごとにIN句でクエリ
- **キャッシュ**: DW APIユーザー情報は10分間キャッシュ（LRUCache）
- **ビュー活用**: v_my_sitesで事前に担当現場を統合

### スケーラビリティ

現在のデータ規模:
- crews: 約10万レコード
- sites: 約13万レコード（place_id=170は約133現場）
- v_my_sites: 513レコード

**数千現場規模まで対応可能**（インデックス適用後）

---

## 将来の拡張

### 他プレイスへの対応

`lib/auth/getRoleForPlace.ts`の`PRIME_COMPANY_IDS_BY_PLACE`に追加:

```typescript
const PRIME_COMPANY_IDS_BY_PLACE: Record<number, number[]> = {
  170: [98315, 203104], // dandoli-sample1
  200: [10001, 10002],  // 別プレイス
};
```

### 権限レベルの細分化

現在は2段階（元請け/協力業者）だが、将来的に以下のような拡張が可能:

- `admin`: プレイス管理者（全権限）
- `prime`: 元請け（全現場閲覧 + 編集）
- `prime_readonly`: 元請け（全現場閲覧のみ）
- `sub`: 協力業者（担当現場のみ）

---

## トラブルシューティング

### user_id=40824 が "sub" と判定される

**原因**: DB接続エラー（SSH tunnel未起動）

**解決**: `withSshMysql`を使用してSSH経由でDB接続

### member_keysが空配列になる

**原因**: v_my_sitesビューにレコードがない、またはsite_id抽出失敗

**確認**:
```sql
SELECT * FROM v_my_sites WHERE user_id = 40824 AND site_id = 567377;
```

### ステータスフィルターが効かない

**原因**: quicklist APIへのステータスパラメータが正しく渡されていない

**確認**: ブラウザのNetwork タブでAPIリクエストURLを確認

---

## まとめ

本設計により、以下を実現:

✅ プレイスごとの元請け/協力業者判定（company_idベース）
✅ user_idベースの担当現場管理（v_my_sitesビュー）
✅ ロール別のUI表示制御（トグル表示/非表示）
✅ 高速なクエリパフォーマンス（推奨インデックス適用後）
✅ 柔軟なステータスフィルタリング（配列対応）

**本番環境適用前の確認事項**:
1. 推奨インデックスの作成
2. user_id=40824 での動作確認
3. 協力業者アカウントでの動作確認
4. ステータスフィルタの全パターンテスト
