# DB調査レポート: 40824と567377の紐付け状況

**調査日**: 2025-11-17
**対象**: ユーザー40824（小坂井 優）と現場567377（山本様邸新築工事）の紐付け状況
**DB**: STG Work DB (dandolijp)
**プレイスID**: 170

---

## 📋 調査結果サマリー

### 4-1. sites_crewsテーブルでの紐付け状況

**SQL実行結果**:

```sql
-- SQL1: site_id = 567377 の全レコード
SELECT * FROM sites_crews WHERE site_id = 567377;
-- 結果: 9件のレコード（crew_id: 205014, 72377, 205015, 248630, 295614, 205013, 397684, 255336, 426414）

-- SQL2: site_id = 567377 AND crew_id = 40824
SELECT * FROM sites_crews WHERE site_id = 567377 AND crew_id = 40824;
-- 結果: ❌ 0件（紐づいていない）

-- SQL3: crew_id = 40824 の担当現場（サンプル10件）
SELECT site_id, user_level, deleted FROM sites_crews WHERE crew_id = 40824 LIMIT 10;
-- 結果: ✅ 10件（他の現場には担当として登録されている）
```

**結論**: `sites_crews`テーブルには、`site_id=567377` と `crew_id=40824` の組み合わせが**存在しません**。

ただし、40824は以下のカラムに含まれています：
- `created_user_id`: 8件（現場参加者を登録したユーザー）
- `modified_user_id`: 8件（現場参加者を更新したユーザー）

---

### 4-2. site_idカラムを持つ全テーブル

**SQL実行結果**:

```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dandolijp'
  AND COLUMN_NAME = 'site_id';
```

**結果**: 35個のテーブル

主要なテーブル:
1. `sites` - 現場マスタ
2. `sites_crews` - 現場参加ユーザー
3. `site_casts` - 役割担当者
4. `site_comments` - コメント
5. `site_schedules` - スケジュール
6. `prime_contract_sites_crews` - 元請け契約の現場参加者
7. `v_managers` - 現場管理担当者ビュー
8. ... 他28テーブル

---

### 4-3. 現場管理担当者・役割担当者・参加ユーザーの格納場所

#### 1. **sitesテーブル（現場マスタ）**

**テーブル構造**（抜粋）:
- `id` (int) - 現場ID
- `place_id` (int) - プレイスID
- `name` (varchar) - 現場名
- `created_user_id` (int) - 作成者
- `modified_user_id` (int) - 最終更新者

**site_id = 567377 の状況**:
- `created_user_id`: 67463
- `modified_user_id`: **40824** ← ✅ 40824が含まれる

**結論**: `sites`テーブル自体には現場管理担当者を格納するカラムは存在しません。`created_user_id`と`modified_user_id`は「作成・編集したユーザー」であり、「担当者」とは異なります。

---

#### 2. **site_castsテーブル（役割担当者）**

**テーブル構造**:
- `id` (int) - レコードID
- `site_id` (int) - 現場ID
- `crew_id` (int) - ユーザーID
- `cast_id` (int) - 役割ID
- `created_user_id` (int) - 登録者
- `modified_user_id` (int) - 更新者
- `deleted` (tinyint) - 削除フラグ

**site_id = 567377 の状況**:
```
[1] crew_id=248630, cast_id=1982, created_user_id=40824, deleted=1
[2] crew_id=295614, cast_id=1983, created_user_id=40824, deleted=1
```

**結論**: 40824は`created_user_id`として含まれていますが、`crew_id`（役割担当者本人）としては含まれていません。また、両レコードとも`deleted=1`で削除済みです。

---

#### 3. **sites_crewsテーブル（参加ユーザー）**

**テーブル構造**:
- `id` (int) - レコードID
- `site_id` (int) - 現場ID
- `crew_id` (int) - ユーザーID
- `user_level` (int) - ユーザーレベル
- `deleted` (tinyint) - 削除フラグ

**site_id = 567377 の状況**:
- `crew_id=40824` のレコードは**0件**
- ただし、`created_user_id=40824` のレコードは8件

**結論**: 40824は参加ユーザーとして登録されていません。

---

#### 4. **v_managersビュー（現場管理担当者）**

**ビュー構造**:
- `crew_id` (int) - ユーザーID
- `site_id` (int) - 現場ID
- `admin_level` (varchar) - 管理者レベル（0,1,2,3）

**site_id = 567377 の状況**:
```
[1] crew_id=72369, admin_level='0'
[2] crew_id=205013, admin_level='1'
[3] crew_id=352177, admin_level='3'
[4] crew_id=476210, admin_level='2'
```

**結論**: 40824は`v_managers`ビューに含まれていません。

---

#### 5. **prime_contract_sites_crewsテーブル（元請け契約の現場参加者）**

**テーブル構造**:
- `place_id` (int) - プレイスID
- `site_id` (int) - 現場ID
- `prime_contract_place_id` (int) - 元請けプレイスID
- `prime_contract_crew_id` (int) - 元請けユーザーID
- `prime_contract_user_id` (int) - 元請けユーザーID
- `is_admin` (tinyint) - 管理者フラグ

**site_id = 567377 の状況**:
- レコード数: **0件**

**結論**: このテーブルには567377のレコードが存在しません。

---

## 🔍 ギャップの原因分析

### ユーザーの認識 vs DB の事実

**ユーザーの認識**（スクリーンショットより）:
- DW本体の現場詳細画面では、40824が「現場管理担当者」または「参加ユーザー」に表示されている

**DBの事実**:
- `v_managers`: 40824は含まれていない
- `sites_crews`: 40824は`crew_id`として含まれていない
- `site_casts`: 40824は`crew_id`として含まれていない

### 💡 推測される原因

1. **DW APIとDBの不一致**
   - DW APIが返す情報とDBの内容が異なる可能性
   - APIは別のロジック（権限計算、動的生成など）を使用している可能性

2. **データの同期タイミング**
   - STG Work DBとDW本体DBが異なるDBインスタンスの可能性
   - データ同期の遅延やバッチ処理のタイミング

3. **表示ロジックの違い**
   - DW本体の画面は`created_user_id`や`modified_user_id`を「関係者」として表示している可能性
   - 権限レベル（例：プレイス170の管理者）により、全現場にアクセスできる可能性

---

## 📌 次のアクションアイテム

### 1. DW APIの実際のレスポンスを確認

以下のAPIエンドポイントを呼び出して、40824がどこに含まれているか確認する：

```bash
# 現場詳細
GET /co/places/dandoli-sample1/sites/127083

# 現場参加者
GET /co/places/dandoli-sample1/sites/127083/site_crews
```

### 2. v_my_sitesビューの定義を確認

```sql
SHOW CREATE VIEW v_managers;
```

このビューがどのような条件で現場管理担当者を抽出しているかを確認する。

### 3. 「担当現場」の定義を明確化

以下の3つの情報源を統合した「担当現場」の定義を決定する：

- **現場管理担当者**: `v_managers.crew_id`
- **役割担当者**: `site_casts.crew_id` (deleted=0)
- **参加ユーザー**: `sites_crews.crew_id` (deleted=0)

### 4. v_my_sitesビューの作成

```sql
CREATE OR REPLACE VIEW v_my_sites AS
SELECT DISTINCT
  s.id AS site_id,
  u.crew_id AS user_id
FROM sites s
JOIN (
  -- 現場管理担当者
  SELECT site_id, crew_id FROM v_managers
  UNION
  -- 役割担当者
  SELECT site_id, crew_id FROM site_casts WHERE deleted = 0
  UNION
  -- 参加ユーザー
  SELECT site_id, crew_id FROM sites_crews WHERE deleted = 0
) m ON m.site_id = s.id
WHERE s.place_id = 170
  AND s.deleted = 0;
```

### 5. /api/sites/quicklist の実装

- DW APIから現場一覧を取得
- `v_my_sites`ビューで担当現場を特定
- `isMine: true/false`を付与してレスポンス

---

## 📝 まとめ

**40824と567377の紐付け状況（DB調査結果）**:

| 情報源 | カラム | 40824の状況 | 備考 |
|--------|--------|------------|------|
| sites | modified_user_id | ✅ 含まれる | 最終更新者 |
| sites_crews | crew_id | ❌ 含まれない | 参加ユーザーではない |
| sites_crews | created_user_id | ✅ 含まれる（8件） | 参加者を登録した人 |
| site_casts | crew_id | ❌ 含まれない | 役割担当者ではない |
| site_casts | created_user_id | ✅ 含まれる（2件、削除済み） | 役割を登録した人 |
| v_managers | crew_id | ❌ 含まれない | 現場管理担当者ではない |

**結論**:
- DBの観点では、40824は567377の「作成・編集者」ではあるが、「担当者（crew, cast, manager）」ではありません。
- ユーザーが見ている情報との不一致は、DW APIの動的ロジックやプレイスレベルの権限に起因する可能性が高いです。
- 次のステップとして、DW APIの実際のレスポンスを確認し、「担当現場」の定義を最終決定する必要があります。
