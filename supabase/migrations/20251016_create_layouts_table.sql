-- 黒板レイアウトマスタテーブル作成
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  layout_key TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  is_system BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- templatesテーブルにlayout_id追加
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES layouts(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_layouts_layout_key ON layouts(layout_key);
CREATE INDEX IF NOT EXISTS idx_templates_layout_id ON templates(layout_id);

-- 12種類の基本レイアウトデータ挿入
INSERT INTO layouts (name, description, layout_key, config, display_order) VALUES
  (
    '標準レイアウト（左下）',
    '黒板を写真の左下に配置。工事名を上部に表示し、その他項目を2列グリッドで配置',
    'standard-left-bottom',
    '{
      "position": {"x": 0.02, "y": 0.78},
      "width": 0.35,
      "height": 0.20,
      "grid": {"columns": 2, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    1
  ),
  (
    '中央配置',
    '黒板を写真の中央に大きく配置',
    'center',
    '{
      "position": {"x": 0.25, "y": 0.40},
      "width": 0.50,
      "height": 0.30,
      "grid": {"columns": 2, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    2
  ),
  (
    '右下配置',
    '黒板を写真の右下に配置',
    'right-bottom',
    '{
      "position": {"x": 0.63, "y": 0.78},
      "width": 0.35,
      "height": 0.20,
      "grid": {"columns": 2, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    3
  ),
  (
    '左上配置',
    '黒板を写真の左上に配置',
    'left-top',
    '{
      "position": {"x": 0.02, "y": 0.02},
      "width": 0.35,
      "height": 0.20,
      "grid": {"columns": 2, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    4
  ),
  (
    '右上配置',
    '黒板を写真の右上に配置',
    'right-top',
    '{
      "position": {"x": 0.63, "y": 0.02},
      "width": 0.35,
      "height": 0.20,
      "grid": {"columns": 2, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    5
  ),
  (
    '上部全幅',
    '黒板を写真の上部に横長で配置',
    'top-full-width',
    '{
      "position": {"x": 0.05, "y": 0.02},
      "width": 0.90,
      "height": 0.15,
      "grid": {"columns": 4, "gap": 0.02},
      "titlePlacement": "left-side"
    }',
    6
  ),
  (
    '下部全幅',
    '黒板を写真の下部に横長で配置',
    'bottom-full-width',
    '{
      "position": {"x": 0.05, "y": 0.83},
      "width": 0.90,
      "height": 0.15,
      "grid": {"columns": 4, "gap": 0.02},
      "titlePlacement": "left-side"
    }',
    7
  ),
  (
    '左側縦長',
    '黒板を写真の左側に縦長で配置',
    'left-vertical',
    '{
      "position": {"x": 0.02, "y": 0.20},
      "width": 0.25,
      "height": 0.60,
      "grid": {"columns": 1, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    8
  ),
  (
    '右側縦長',
    '黒板を写真の右側に縦長で配置',
    'right-vertical',
    '{
      "position": {"x": 0.73, "y": 0.20},
      "width": 0.25,
      "height": 0.60,
      "grid": {"columns": 1, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    9
  ),
  (
    '3列グリッド（中央）',
    '項目を3列で配置して情報量を多く表示',
    'grid-3-center',
    '{
      "position": {"x": 0.15, "y": 0.40},
      "width": 0.70,
      "height": 0.30,
      "grid": {"columns": 3, "gap": 0.02},
      "titlePlacement": "top-full-width"
    }',
    10
  ),
  (
    'コンパクト（左下）',
    '最小サイズで左下に配置。邪魔にならないレイアウト',
    'compact-left-bottom',
    '{
      "position": {"x": 0.02, "y": 0.85},
      "width": 0.25,
      "height": 0.13,
      "grid": {"columns": 2, "gap": 0.01},
      "titlePlacement": "top-full-width"
    }',
    11
  ),
  (
    '大型（中央）',
    '大きく見やすい黒板を中央に配置',
    'large-center',
    '{
      "position": {"x": 0.10, "y": 0.30},
      "width": 0.80,
      "height": 0.40,
      "grid": {"columns": 2, "gap": 0.03},
      "titlePlacement": "top-full-width"
    }',
    12
  )
ON CONFLICT (layout_key) DO NOTHING;

-- 既存テンプレートに標準レイアウトを設定
UPDATE templates
SET layout_id = (SELECT id FROM layouts WHERE layout_key = 'standard-left-bottom')
WHERE layout_id IS NULL;
