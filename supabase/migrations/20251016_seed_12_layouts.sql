-- ─────────────────────────────────────────────────────────
-- 12パターンレイアウトSEED（アップサート対応）
-- 作成日: 2025-10-16
-- 説明: 蔵衛門互換の12種類のレイアウトパターン
-- ─────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────
-- (必要なら) テーブル作成
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  layout_key TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL,
  thumbnail_url TEXT,
  version INT NOT NULL DEFAULT 1,
  usage_count INT NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────
-- 12パターン INSERT (idempotent：layout_key でUPSERT)
-- すべて正規化座標(0-1)／anchorはアンカー点そのものをx,yに配置
-- safeArea.bottom は 0.10 以上
-- ─────────────────────────────────────────────────────────

-- 1. 標準レイアウト（左下） - 左下・2列・最も一般的
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '標準（左下）',
  '左下・2列・現場で最も使う基本形',
  'std_left_bottom',
  '{
    "board":{"x":0.02,"y":0.98,"w":0.35,"h":0.20,"anchor":"left-bottom"},
    "grid":{"columns":2,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.055,"scaleTitle":1.10},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 1, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 2. 中央配置 - 中央・2列・目立つ
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '中央配置',
  '中央・2列・被写体とバランス良く見せたい',
  'center_2col',
  '{
    "board":{"x":0.50,"y":0.50,"w":0.42,"h":0.22,"anchor":"center-center"},
    "grid":{"columns":2,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.058,"scaleTitle":1.12},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.03,"right":0.03},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 2, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 3. 右下配置 - 右下・2列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '右下配置',
  '右下・2列・標準の左右反転',
  'right_bottom_2col',
  '{
    "board":{"x":0.98,"y":0.98,"w":0.35,"h":0.20,"anchor":"right-bottom"},
    "grid":{"columns":2,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.055,"scaleTitle":1.10},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 3, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 4. 左上配置 - 左上・2列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '左上配置',
  '左上・2列・縦構図でも使いやすい',
  'left_top_2col',
  '{
    "board":{"x":0.02,"y":0.02,"w":0.35,"h":0.20,"anchor":"left-top"},
    "grid":{"columns":2,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.055,"scaleTitle":1.10},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 4, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 5. 右上配置 - 右上・2列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '右上配置',
  '右上・2列・左上の反転',
  'right_top_2col',
  '{
    "board":{"x":0.98,"y":0.02,"w":0.35,"h":0.20,"anchor":"right-top"},
    "grid":{"columns":2,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.055,"scaleTitle":1.10},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 5, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 6. 上部全幅 - 上部横長・4列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '上部全幅（横長・4列）',
  '上端に細長く全幅・4列で情報を並べる',
  'top_full_4col',
  '{
    "board":{"x":0.50,"y":0.02,"w":0.92,"h":0.18,"anchor":"center-top"},
    "grid":{"columns":4,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.050,"scaleTitle":1.08},
    "safeArea":{"bottom":0.12,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 6, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 7. 下部全幅 - 下部横長・4列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '下部全幅（横長・4列）',
  '下端に全幅・4列。工程サマリ向け',
  'bottom_full_4col',
  '{
    "board":{"x":0.50,"y":0.98,"w":0.92,"h":0.20,"anchor":"center-bottom"},
    "grid":{"columns":4,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.050,"scaleTitle":1.08},
    "safeArea":{"bottom":0.12,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 7, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 8. 左側縦長 - 左側縦長・1列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '左側縦長（1列）',
  '左側に縦長・1列。縦写真や項目少なめ向け',
  'left_vertical_1col',
  '{
    "board":{"x":0.02,"y":0.50,"w":0.28,"h":0.60,"anchor":"left-center"},
    "grid":{"columns":1,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.1},
    "typography":{"base":0.060,"scaleTitle":1.12},
    "safeArea":{"bottom":0.12,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 8, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 9. 右側縦長 - 右側縦長・1列
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '右側縦長（1列）',
  '右側に縦長・1列。左右反転版',
  'right_vertical_1col',
  '{
    "board":{"x":0.98,"y":0.50,"w":0.28,"h":0.60,"anchor":"right-center"},
    "grid":{"columns":1,"gap":0.02,"titlePlacement":"top-full-width","remarksScale":1.1},
    "typography":{"base":0.060,"scaleTitle":1.12},
    "safeArea":{"bottom":0.12,"top":0.05,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 9, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 10. 3列グリッド（中央） - 中央・3列・情報量多め
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '3列グリッド（中央）',
  '中央・3列で情報量多め。見やすさと密度の両立',
  'center_3col_dense',
  '{
    "board":{"x":0.50,"y":0.70,"w":0.60,"h":0.28,"anchor":"center-center"},
    "grid":{"columns":3,"gap":0.018,"titlePlacement":"top-full-width","remarksScale":1.0},
    "typography":{"base":0.052,"scaleTitle":1.10},
    "safeArea":{"bottom":0.10,"top":0.05,"left":0.025,"right":0.025},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 10, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 11. コンパクト（左下） - 最小・左下・邪魔にならない
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  'コンパクト（左下）',
  '左下・小型。被写体優先で邪魔にならない',
  'compact_left_bottom',
  '{
    "board":{"x":0.02,"y":0.98,"w":0.25,"h":0.14,"anchor":"left-bottom"},
    "grid":{"columns":2,"gap":0.018,"titlePlacement":"top-full-width","remarksScale":0.9},
    "typography":{"base":0.050,"scaleTitle":1.06},
    "safeArea":{"bottom":0.10,"top":0.045,"left":0.02,"right":0.02},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 11, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- 12. 大型（中央） - 大きく見やすい・中央
INSERT INTO public.layouts (name, description, layout_key, config, version, is_system, display_order, updated_at)
VALUES (
  '大型（中央）',
  '中央・大型。読みやすさ最優先',
  'large_center',
  '{
    "board":{"x":0.50,"y":0.58,"w":0.70,"h":0.35,"anchor":"center-center"},
    "grid":{"columns":2,"gap":0.022,"titlePlacement":"top-full-width","remarksScale":1.05},
    "typography":{"base":0.060,"scaleTitle":1.14},
    "safeArea":{"bottom":0.12,"top":0.06,"left":0.03,"right":0.03},
    "style":{"variant":"green","opacity":0.92}
  }'::jsonb,
  1, true, 12, now()
)
ON CONFLICT (layout_key) DO UPDATE SET config = EXCLUDED.config, updated_at = now(), display_order = EXCLUDED.display_order;

-- ─────────────────────────────────────────────────────────
-- (任意) 使用回数インクリメントRPC（POST /api/layouts で使用）
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_layout_usage(layout_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.layouts
  SET usage_count = usage_count + 1,
      updated_at = now()
  WHERE id = layout_id;
END;
$$;
