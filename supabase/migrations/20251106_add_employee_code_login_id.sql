-- employee_code と login_id カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_id TEXT;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);
