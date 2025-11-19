-- =========================================================================
-- v_my_sites ビュー定義
-- =========================================================================
-- 目的: ユーザーが「担当している現場」を高速に検索するためのビュー
--
-- 統合元テーブル:
--   1. v_managers: 現場管理担当者（manager, sub_admin1-3）
--   2. site_casts: 役割担当者
--   3. sites_crews: 現場参加ユーザー
--
-- 使用例:
--   SELECT DISTINCT site_id FROM v_my_sites WHERE user_id = 40364;
--
-- 詳細仕様: docs/dw-integration-spec.md を参照
-- =========================================================================

CREATE OR REPLACE VIEW v_my_sites AS

-- -----------------------------------------------------------------------
-- 1. 現場管理担当者（manager, sub_admin1, sub_admin2, sub_admin3）
-- -----------------------------------------------------------------------
SELECT
  s.id AS site_id,
  s.manager_admin AS user_id,
  'manager' AS relation_type
FROM sites s
WHERE s.deleted = 0
  AND s.manager_admin IS NOT NULL

UNION ALL

SELECT
  s.id AS site_id,
  s.manager_sub_admin1 AS user_id,
  'manager' AS relation_type
FROM sites s
WHERE s.deleted = 0
  AND s.manager_sub_admin1 IS NOT NULL

UNION ALL

SELECT
  s.id AS site_id,
  s.manager_sub_admin2 AS user_id,
  'manager' AS relation_type
FROM sites s
WHERE s.deleted = 0
  AND s.manager_sub_admin2 IS NOT NULL

UNION ALL

SELECT
  s.id AS site_id,
  s.manager_sub_admin3 AS user_id,
  'manager' AS relation_type
FROM sites s
WHERE s.deleted = 0
  AND s.manager_sub_admin3 IS NOT NULL

UNION ALL

-- -----------------------------------------------------------------------
-- 2. 役割担当者（site_casts）
-- -----------------------------------------------------------------------
SELECT
  sc.site_id AS site_id,
  sc.cast AS user_id,
  'cast' AS relation_type
FROM site_casts sc
JOIN sites s ON sc.site_id = s.id
WHERE s.deleted = 0
  AND sc.cast IS NOT NULL

UNION ALL

-- -----------------------------------------------------------------------
-- 3. 現場参加ユーザー（sites_crews）
-- -----------------------------------------------------------------------
SELECT
  scr.site_id AS site_id,
  scr.worker AS user_id,
  'crew' AS relation_type
FROM sites_crews scr
JOIN sites s ON scr.site_id = s.id
WHERE s.deleted = 0
  AND scr.worker IS NOT NULL;

-- =========================================================================
-- インデックス推奨（パフォーマンス向上）
-- =========================================================================
-- CREATE INDEX idx_v_my_sites_user_site ON v_my_sites (user_id, site_id);
-- CREATE INDEX idx_v_my_sites_site ON v_my_sites (site_id);
--
-- ※ ビューに直接インデックスは作成できないため、実テーブルに作成すること
-- =========================================================================
