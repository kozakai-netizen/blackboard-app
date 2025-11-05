// types/layouts.ts
// 黒板レイアウトシステムの型定義

/**
 * アンカー位置（9種類に固定）
 */
export type Anchor =
  | 'left-top' | 'center-top' | 'right-top'
  | 'left-middle' | 'center-middle' | 'right-middle'
  | 'left-bottom' | 'center-bottom' | 'right-bottom';

/**
 * レイアウト設定
 * すべての座標・サイズは正規化（0-1）で管理
 */
export type LayoutConfig = {
  board: {
    x: number;        // 0-1: アンカー点のX座標（fit領域基準）
    y: number;        // 0-1: アンカー点のY座標（fit領域基準）
    w: number;        // 0-1: 黒板の幅（fit.drawW基準）
    h: number;        // 0-1: 黒板外枠の高さ（最小値）※safeArea含む
    anchor?: Anchor;  // アンカー位置（デフォルト: 'left-top'）
  };
  grid: {
    columns: 1 | 2 | 3 | 4;  // グリッド列数
    gap: number;             // 0-1: 黒板幅に対する項目間ギャップ比率
    titlePlacement?: 'top-full-width' | 'top-center' | 'top-left' | 'left-side';
    remarksScale?: number;   // 備考欄の高さ倍率（デフォルト1.0）
  };
  typography: {
    base: number;            // 黒板幅に対するフォントサイズ比率
    scaleTitle?: number;     // タイトルの拡大率（デフォルト1.0）
  };
  safeArea?: {
    bottom?: number;         // 0-1: 外枠の高さに対する下部余白比率（SHA-256対策）
    top?: number;            // 0-1: 外枠の高さに対する上部余白比率
    left?: number;           // 0-1: 外枠の幅に対する左余白比率
    right?: number;          // 0-1: 外枠の幅に対する右余白比率
  };
  style: {
    variant: 'green' | 'black';
    opacity: number;         // 0-1
    bgColor?: string;        // 背景色（オーバーライド用）
    textColor?: string;      // 文字色（オーバーライド用）
  };
};

/**
 * レイアウトマスタ
 */
export type Layout = {
  id: string;
  name: string;
  description?: string | null;
  layout_key: string;
  config: LayoutConfig;
  thumbnail_url?: string | null;
  version: number;
  usage_count: number;
  is_system: boolean;        // システム標準レイアウトフラグ
  display_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * テンプレート（レイアウト参照を追加）
 */
export type Template = {
  id: string;
  name: string;
  description?: string | null;
  fields: string[];
  default_values: Record<string, unknown> | null;
  design_settings?: Partial<LayoutConfig> & {
    fontSize?: 'standard' | 'large';
    textColor?: string;
    bgColor?: string;
    position?: { x: number; y: number };  // 旧形式（互換性のため残す）
    width?: number;
    height?: number;
  } | null;
  layout_id?: string | null;  // レイアウトへの参照
  is_default: boolean;
  usage_count: number;
  last_used?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * anchor指定を左上座標に変換
 * GPT先生推奨：境界付近の1px誤差防止のためクランプ＋丸め追加
 *
 * @param board - 黒板設定（anchor, x, y, w, h）
 * @returns 左上座標 { x, y }（0-1範囲にクランプ、小数点以下4桁に丸め）
 */
export function anchorToTopLeft(
  board: { x: number; y: number; w: number; h: number; anchor?: Anchor }
): { x: number; y: number } {
  const anchor = board.anchor || 'left-top';

  let x = board.x;
  let y = board.y;

  // 横方向
  if (anchor.startsWith('center-')) x = board.x - board.w / 2;
  else if (anchor.startsWith('right-')) x = board.x - board.w;

  // 縦方向
  if (anchor.endsWith('-middle')) y = board.y - board.h / 2;
  else if (anchor.endsWith('-bottom')) y = board.y - board.h;

  // ★ クランプ（0-1範囲）＋丸め（小数点以下4桁）
  x = Math.max(0, Math.min(1, Math.round(x * 10000) / 10000));
  y = Math.max(0, Math.min(1, Math.round(y * 10000) / 10000));

  return { x, y };
}
