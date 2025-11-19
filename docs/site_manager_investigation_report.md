# STGデータベース - 現場管理担当者調査レポート

**調査日時**: 2025-11-11
**データベース**: dandolijp (STG環境)
**調査対象**: 現場567377の管理担当者データ

---

## 📋 調査結果サマリー

### 1. 現場管理担当者のデータ保存先

✅ **テーブル名**: `contracts`

現場管理担当者のデータは`contracts`テーブルに保存されています。

#### カラム構造

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| `admin` | int | 主管理者のユーザーID |
| `sub_admin1` | int | 副管理者1のユーザーID |
| `sub_admin2` | int | 副管理者2のユーザーID |
| `sub_admin3` | int | 副管理者3のユーザーID |
| `sub_admin4` | int | 副管理者4のユーザーID |
| `sub_admin5` | int | 副管理者5のユーザーID |

---

### 2. v_managers ビュー

`v_managers`は`contracts`テーブルをUNION ALL形式で展開したビューです。

#### ビュー定義

```sql
CREATE VIEW v_managers AS
SELECT admin AS crew_id, site_id, '0' AS admin_level FROM contracts WHERE admin IS NOT NULL
UNION ALL
SELECT sub_admin1 AS crew_id, site_id, '1' AS admin_level FROM contracts WHERE sub_admin1 IS NOT NULL
UNION ALL
SELECT sub_admin2 AS crew_id, site_id, '2' AS admin_level FROM contracts WHERE sub_admin2 IS NOT NULL
UNION ALL
SELECT sub_admin3 AS crew_id, site_id, '3' AS admin_level FROM contracts WHERE sub_admin3 IS NOT NULL
UNION ALL
SELECT sub_admin4 AS crew_id, site_id, '4' AS admin_level FROM contracts WHERE sub_admin4 IS NOT NULL
UNION ALL
SELECT sub_admin5 AS crew_id, site_id, '5' AS admin_level FROM contracts WHERE sub_admin5 IS NOT NULL
ORDER BY crew_id, site_id, admin_level;
```

#### カラム構造

| カラム名 | データ型 | 説明 |
|---------|---------|------|
| `crew_id` | int | ユーザーID (usersテーブルのid) |
| `site_id` | int | 現場ID (sitesテーブルのid) |
| `admin_level` | varchar(1) | 管理レベル (0=主管理者, 1=副管理者1, ...) |

---

## 🔍 現場567377の管理担当者データ

### contractsテーブルのデータ

| 役割 | user_id | 備考 |
|------|---------|------|
| 主管理者 (admin) | 72369 | usersテーブルに該当レコードなし |
| 副管理者1 (sub_admin1) | 205013 | usersテーブルに該当レコードなし |
| 副管理者2 (sub_admin2) | 476210 | usersテーブルに該当レコードなし |
| 副管理者3 (sub_admin3) | 352177 | usersテーブルに該当レコードなし |
| 副管理者4 (sub_admin4) | NULL | - |
| 副管理者5 (sub_admin5) | NULL | - |

### 確認事項

❌ **user_id=40824（小坂井優）は現場567377の管理担当者として登録されていません**

✅ user_id=40824は他の現場（10件）で主管理者として登録されています：
- site_id: 391023 - ㈱大等興業　様邸
- site_id: 385684 - 田上　純子　様邸
- site_id: 385650 - 田上　純子　様邸
- （他7件）

---

## 💡 ユーザー名の取得方法

### SQL クエリ

管理担当者の名前を取得するには、`profiles`テーブルをJOINします。

```sql
SELECT
  v.crew_id,
  v.admin_level,
  CONCAT(p.user_last_name, ' ', p.user_first_name) as fullname,
  u.username
FROM v_managers v
LEFT JOIN users u ON v.crew_id = u.id
LEFT JOIN profiles p ON v.crew_id = p.user_id
WHERE v.site_id = ?
ORDER BY v.admin_level;
```

### admin_levelの意味

| admin_level | 役割 |
|-------------|------|
| 0 | 主管理者 |
| 1 | 副管理者1 |
| 2 | 副管理者2 |
| 3 | 副管理者3 |
| 4 | 副管理者4 |
| 5 | 副管理者5 |

---

## 📊 関連テーブル一覧

### 1. contracts テーブル

現場管理担当者の実データを保存。

**主要カラム**:
- `site_id` - 現場ID
- `admin` - 主管理者のユーザーID
- `sub_admin1` ～ `sub_admin5` - 副管理者のユーザーID
- `admin_signature_flg` ～ `sub_admin5_signature_flg` - 署名フラグ

### 2. sites テーブル

現場の基本情報。

**主要カラム**:
- `id` - 現場ID
- `name` - 現場名
- `place_id` - 事業所ID
- `site_code` - 現場コード
- `deleted` - 削除フラグ

**注意**: sitesテーブルには管理者情報のカラムはありません。

### 3. sites_crews テーブル

現場とユーザーの多対多リレーション。

**主要カラム**:
- `site_id` - 現場ID
- `crew_id` - ユーザーID
- `user_level` - ユーザーレベル（権限）
- `deleted` - 削除フラグ

**用途**: 現場参加者の管理（管理者とは別）

### 4. users テーブル

ユーザーアカウント情報。

**主要カラム**:
- `id` - ユーザーID
- `username` - ログインID（メールアドレス）
- `created` - 作成日時
- `deleted` - 削除フラグ

### 5. profiles テーブル

ユーザーのプロフィール情報。

**主要カラム**:
- `user_id` - ユーザーID (usersテーブルのid)
- `user_first_name` - 名
- `user_last_name` - 姓
- `user_tel1`, `user_tel2`, `user_tel3` - 電話番号（分割）
- `deleted` - 削除フラグ

---

## 🚨 注意事項

### 1. 削除済みユーザーの扱い

現場567377の管理担当者として登録されているuser_id（72369, 205013, 476210, 352177）は、`users`テーブルに該当レコードが存在しません。

これは以下のいずれかの理由が考えられます：
- ユーザーが削除された（deleted=1）
- テストデータである
- データ不整合

### 2. データ整合性

`contracts`テーブルのadmin/sub_admin*カラムはNULL許可のため、管理者が設定されていない現場も存在します。

### 3. パフォーマンス

`v_managers`ビューはUNION ALLで複数回contractsテーブルをスキャンするため、大量データを扱う場合はパフォーマンスに注意が必要です。

---

## 📝 推奨クエリ

### 特定現場の管理者一覧取得

```sql
SELECT
  CASE v.admin_level
    WHEN '0' THEN '主管理者'
    WHEN '1' THEN '副管理者1'
    WHEN '2' THEN '副管理者2'
    WHEN '3' THEN '副管理者3'
    WHEN '4' THEN '副管理者4'
    WHEN '5' THEN '副管理者5'
  END as role,
  v.crew_id,
  CONCAT(p.user_last_name, ' ', p.user_first_name) as fullname,
  u.username
FROM v_managers v
LEFT JOIN users u ON v.crew_id = u.id AND u.deleted = 0
LEFT JOIN profiles p ON v.crew_id = p.user_id AND p.deleted = 0
WHERE v.site_id = 567377
ORDER BY v.admin_level;
```

### 特定ユーザーの管理現場一覧取得

```sql
SELECT
  v.site_id,
  s.name as site_name,
  CASE v.admin_level
    WHEN '0' THEN '主管理者'
    WHEN '1' THEN '副管理者1'
    WHEN '2' THEN '副管理者2'
    WHEN '3' THEN '副管理者3'
    WHEN '4' THEN '副管理者4'
    WHEN '5' THEN '副管理者5'
  END as role
FROM v_managers v
LEFT JOIN sites s ON v.site_id = s.id AND s.deleted = 0
WHERE v.crew_id = 40824
ORDER BY v.site_id DESC;
```

### 管理者が設定されていない現場を検索

```sql
SELECT
  id,
  name
FROM sites
WHERE id IN (
  SELECT site_id
  FROM contracts
  WHERE admin IS NULL
)
AND deleted = 0;
```

---

## 🔧 調査スクリプト

調査に使用したスクリプトは以下のディレクトリに保存されています：

- `/Users/dw1005/Desktop/blackboard-app/scripts/search-site-manager.ts`
- `/Users/dw1005/Desktop/blackboard-app/scripts/search-site-casts.ts`
- `/Users/dw1005/Desktop/blackboard-app/scripts/investigate-managers.ts`
- `/Users/dw1005/Desktop/blackboard-app/scripts/final-manager-check.ts`
- `/Users/dw1005/Desktop/blackboard-app/scripts/complete-manager-check.ts`

### 実行方法

```bash
DB_HOST=127.0.0.1 \
DB_PORT=13306 \
DB_NAME=dandolijp \
DB_USER=dandoliworks \
DB_PASSWORD='YtwU5w_de&Qk' \
npx tsx scripts/complete-manager-check.ts
```

---

## 📌 まとめ

| 項目 | 内容 |
|------|------|
| **テーブル名** | `contracts` |
| **管理者カラム** | `admin`, `sub_admin1` ～ `sub_admin5` |
| **ビュー名** | `v_managers` |
| **名前取得元** | `profiles` テーブル (`user_last_name` + `user_first_name`) |
| **現場567377の管理者** | 4名（user_id: 72369, 205013, 476210, 352177） |
| **user_id=40824の登録** | ❌ 現場567377には登録されていない |

---

**作成者**: Claude Code
**ファイルパス**: `/Users/dw1005/Desktop/blackboard-app/docs/site_manager_investigation_report.md`
