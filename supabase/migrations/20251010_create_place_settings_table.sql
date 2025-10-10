-- プレイス設定マスタテーブル作成
CREATE TABLE IF NOT EXISTS place_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_code TEXT NOT NULL,
  setting_type TEXT NOT NULL,  -- 'site_status', 'site_type', 'role' など
  setting_id INTEGER NOT NULL,  -- 1, 2, 3... (APIのID)
  default_name TEXT,  -- デフォルト名（「追客中」「契約中」等）
  custom_name TEXT NOT NULL,  -- カスタマイズ後の名称（「現調中（見積未提出）」等）
  display_order INTEGER,  -- 表示順
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(place_code, setting_type, setting_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_place_settings_place_code ON place_settings(place_code);
CREATE INDEX IF NOT EXISTS idx_place_settings_type ON place_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_place_settings_lookup ON place_settings(place_code, setting_type, setting_id);

COMMENT ON TABLE place_settings IS 'プレイス設定マスタ（ステータス名・現場種類名などのカスタム名称管理）';

-- RLS (Row Level Security) を有効化
ALTER TABLE place_settings ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Place settings are viewable by everyone" ON place_settings
  FOR SELECT USING (true);

-- サービスロールのみ書き込み可能
CREATE POLICY "Place settings are insertable by service role" ON place_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Place settings are updatable by service role" ON place_settings
  FOR UPDATE USING (true);

CREATE POLICY "Place settings are deletable by service role" ON place_settings
  FOR DELETE USING (true);

-- 初期データ投入（dandoli-sample1のステータス設定）
INSERT INTO place_settings (place_code, setting_type, setting_id, default_name, custom_name, display_order) VALUES
('dandoli-sample1', 'site_status', 1, '追客中', '現調中（見積未提出）', 1),
('dandoli-sample1', 'site_status', 2, '契約中', '現調中（見積提出済み）', 2),
('dandoli-sample1', 'site_status', 3, '着工中', '工事中', 3),
('dandoli-sample1', 'site_status', 4, '完工', '完工', 4),
('dandoli-sample1', 'site_status', 5, '中止', 'アフター', 5),
('dandoli-sample1', 'site_status', 6, '他決', '中止・他決', 6)
ON CONFLICT (place_code, setting_type, setting_id) DO NOTHING;

-- 現場種類の初期データ（スクショから）
INSERT INTO place_settings (place_code, setting_type, setting_id, default_name, custom_name, display_order) VALUES
('dandoli-sample1', 'site_type', 1, 'リフォーム', '解体_木造', 8),
('dandoli-sample1', 'site_type', 2, '新築', '解体_鉄骨造', 11),
('dandoli-sample1', 'site_type', 3, 'その他', '解体_内部', 12);
-- 他の種類も必要に応じて追加
