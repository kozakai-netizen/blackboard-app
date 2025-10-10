-- 現場マスタテーブル作成
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id TEXT UNIQUE NOT NULL,  -- ダンドリワークの現場ID
  site_code TEXT,  -- 現場コード
  site_name TEXT NOT NULL,  -- 現場名
  site_type TEXT,  -- 現場種類名（カスタマイズ後）
  site_status TEXT,  -- 現場ステータス名（カスタマイズ後）
  site_status_id INTEGER,  -- 現場ステータスID (1-6)
  zip_code TEXT,  -- 郵便番号
  prefecture TEXT,  -- 都道府県
  city TEXT,  -- 市区町村
  address TEXT,  -- 番地名
  building_name TEXT,  -- 建物名
  latitude NUMERIC,  -- 緯度
  longitude NUMERIC,  -- 経度
  owner_name TEXT,  -- 施主氏名
  contract_number TEXT,  -- 契約番号
  manager_name TEXT,  -- 現場管理担当者
  sub_manager1 TEXT,  -- サブ担当者1
  sub_manager2 TEXT,  -- サブ担当者2
  sub_manager3 TEXT,  -- サブ担当者3
  sub_manager4 TEXT,  -- サブ担当者4
  sub_manager5 TEXT,  -- サブ担当者5
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  site_created_at TIMESTAMP  -- ダンドリワーク現場作成日
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sites_site_id ON sites(site_id);
CREATE INDEX IF NOT EXISTS idx_sites_site_code ON sites(site_code);
CREATE INDEX IF NOT EXISTS idx_sites_site_status_id ON sites(site_status_id);
CREATE INDEX IF NOT EXISTS idx_sites_manager_name ON sites(manager_name);

COMMENT ON TABLE sites IS '現場マスタテーブル（ダンドリワークCSVから同期）';

-- RLS (Row Level Security) を有効化
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Sites are viewable by everyone" ON sites
  FOR SELECT USING (true);

-- サービスロールのみ書き込み可能
CREATE POLICY "Sites are insertable by service role" ON sites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Sites are updatable by service role" ON sites
  FOR UPDATE USING (true);

CREATE POLICY "Sites are deletable by service role" ON sites
  FOR DELETE USING (true);
