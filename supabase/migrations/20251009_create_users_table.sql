-- ユーザーテーブル作成
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,  -- ダンドリワークのユーザーID
  name TEXT NOT NULL,             -- 氏名
  phone TEXT,                     -- 電話番号
  email TEXT,                     -- メールアドレス
  level TEXT,                     -- レベル（協力業者/元請等）
  permission TEXT,                -- 権限
  industry TEXT,                  -- 業種
  company_id TEXT,                -- 会社ID
  company_name TEXT,              -- 会社名
  office TEXT,                    -- 営業所
  code TEXT,                      -- コード
  last_login TIMESTAMP,           -- 最終ログイン
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- RLS (Row Level Security) を有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- サービスロールのみ書き込み可能
CREATE POLICY "Users are insertable by service role" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users are updatable by service role" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users are deletable by service role" ON users
  FOR DELETE USING (true);
