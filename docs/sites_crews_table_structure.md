# STGデータベース - sites_crews テーブル構造レポート

**確認日時**: 2025年11月11日
**データベース**: dandolijp (STG環境)
**接続方法**: SSHトンネル経由 (port 13306)

---

## 1. テーブル構造

| # | カラム名 | データ型 | NULL許可 | 説明 |
|---|----------|----------|----------|------|
| 1 | id | int | 必須 | プライマリキー |
| 2 | **site_id** | int | NULL可 | **現場ID** |
| 3 | **crew_id** | int | 必須 | **ユーザーID** |
| 4 | user_level | int | 必須 | ユーザーレベル（権限） |
| 5 | created | datetime | 必須 | 作成日時 |
| 6 | created_user_id | int | 必須 | 作成者ID |
| 7 | modified | datetime | 必須 | 更新日時 |
| 8 | modified_user_id | int | 必須 | 更新者ID |
| 9 | deleted | tinyint(1) | 必須 | 削除フラグ (0:有効, 1:削除済み) |
| 10 | deleted_date | datetime | NULL可 | 削除日時 |

---

## 2. 重要カラムの識別

### メインカラム
- **現場ID**: `site_id` (int, NULL可)
- **ユーザーID**: `crew_id` (int, 必須)
- **ユーザーレベル**: `user_level` (int, 必須)
- **削除フラグ**: `deleted` (tinyint(1), 必須)

### 用途
このテーブルは**現場とユーザーの多対多リレーション**を管理するための中間テーブルです。

- 1つの現場に複数のユーザーが紐づく
- 1人のユーザーが複数の現場に紐づく
- ユーザーレベルで権限を管理

---

## 3. サンプルデータ（最新5件）

| ID | site_id | crew_id | user_level | 作成日 |
|----|---------|---------|------------|--------|
| 54749148 | 3375399 | 484448 | 2 | 2025/11/11 |
| 54749147 | 3375399 | 484447 | 2 | 2025/11/11 |
| 54749146 | 3375399 | 484446 | 2 | 2025/11/11 |
| 54749145 | 3375399 | 484445 | 2 | 2025/11/11 |
| 54749144 | 3375399 | 484444 | 2 | 2025/11/11 |

**特徴**:
- 同じsite_id (3375399) に複数のユーザー (crew_id) が紐づいている
- すべてuser_level = 2（特定の権限レベル）

---

## 4. インデックス情報

| タイプ | インデックス名 | カラム |
|--------|---------------|--------|
| 🔑 PRIMARY KEY | PRIMARY | id |
| 📑 INDEX | site_id | site_id |
| 📑 INDEX | crew_id | crew_id |
| 📑 INDEX | index_sites_crews_on_deleted_site_id | deleted, site_id |
| 📑 INDEX | index_sites_crews_on_crew_site_deleted | crew_id, site_id, deleted |

**パフォーマンス最適化**:
- `site_id` と `crew_id` の検索が高速
- `deleted` フラグと組み合わせたクエリにも最適化済み

---

## 5. データ統計

| 項目 | 件数 | 割合 |
|------|------|------|
| **全レコード数** | 54,359,082 | 100% |
| 有効レコード | 18,273,537 | 33.6% |
| 削除済みレコード | 36,085,545 | 66.4% |
| **ユニークな現場数** | 1,721,536 | - |
| **ユニークなユーザー数** | 241,462 | - |

**データの特徴**:
- 約5400万件の大規模テーブル
- 削除済みレコードが66.4%（論理削除方式）
- 平均して1現場あたり約10.6人のユーザーが紐づいている
- 1ユーザーあたり平均約75.6現場に参加

---

## 6. 活用方法

### クエリ例1: 特定現場のユーザー一覧取得
```sql
SELECT crew_id, user_level
FROM sites_crews
WHERE site_id = ? AND deleted = 0
ORDER BY user_level;
```

### クエリ例2: 特定ユーザーの現場一覧取得
```sql
SELECT site_id, user_level
FROM sites_crews
WHERE crew_id = ? AND deleted = 0
ORDER BY created DESC;
```

### クエリ例3: 現場のユーザー数カウント
```sql
SELECT site_id, COUNT(*) as user_count
FROM sites_crews
WHERE deleted = 0
GROUP BY site_id;
```

---

## 7. 注意点

1. **site_idがNULL可**: データ整合性チェックが必要
2. **論理削除方式**: `deleted = 0` の条件を忘れずに
3. **大規模テーブル**: インデックスを活用したクエリ設計が必須
4. **user_levelの意味**: 具体的な権限マッピングは別途確認が必要

---

## 8. 確認スクリプト

テーブル構造を再確認する場合は以下のスクリプトを実行:

```bash
DB_HOST=127.0.0.1 DB_PORT=13306 DB_NAME=dandolijp DB_USER=dandoliworks DB_PASSWORD='YtwU5w_de&Qk' npx tsx scripts/check-sites-crews.ts
```

**スクリプトファイル**: `/Users/dw1005/Desktop/blackboard-app/scripts/check-sites-crews.ts`

---

**作成者**: Claude Code
**ファイルパス**: `/Users/dw1005/Desktop/blackboard-app/docs/sites_crews_table_structure.md`
