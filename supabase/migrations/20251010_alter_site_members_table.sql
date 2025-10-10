-- site_membersテーブルにカラム追加（CSVインポート用）

ALTER TABLE site_members ADD COLUMN IF NOT EXISTS site_name TEXT;
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS company_id TEXT;
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE site_members ADD COLUMN IF NOT EXISTS participation_level INTEGER;
-- 1: 管理担当者, 2: サブ管理担当者, 3: 参加ユーザー

-- UNIQUE制約を変更（site_code, user_idのみ）
ALTER TABLE site_members DROP CONSTRAINT IF EXISTS site_members_site_code_user_id_role_cast_name_key;
ALTER TABLE site_members ADD CONSTRAINT site_members_site_code_user_id_key UNIQUE(site_code, user_id);

COMMENT ON COLUMN site_members.participation_level IS '1:管理担当者, 2:サブ管理担当者, 3:参加ユーザー';
