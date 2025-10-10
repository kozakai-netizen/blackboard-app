-- 現場参加者テーブル作成
CREATE TABLE IF NOT EXISTS site_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT,  -- 'worker' (現場参加者) or 'cast' (役割担当者)
  cast_name TEXT,  -- 役割名（営業担当、営業サポート等）※castの場合のみ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE(site_code, user_id, role, cast_name)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_site_members_site_code ON site_members(site_code);
CREATE INDEX IF NOT EXISTS idx_site_members_user_id ON site_members(user_id);

-- usersテーブルにuser_type列追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;
-- 'motoduke' = 元請, 'kyoryoku' = 協力会社

COMMENT ON COLUMN users.user_type IS '元請(motoduke) / 協力会社(kyoryoku)';
COMMENT ON TABLE site_members IS '現場参加者管理テーブル（ダンドリワークのsite_crews APIから同期）';

-- RLS (Row Level Security) を有効化
ALTER TABLE site_members ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Site members are viewable by everyone" ON site_members
  FOR SELECT USING (true);

-- サービスロールのみ書き込み可能
CREATE POLICY "Site members are insertable by service role" ON site_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Site members are updatable by service role" ON site_members
  FOR UPDATE USING (true);

CREATE POLICY "Site members are deletable by service role" ON site_members
  FOR DELETE USING (true);
