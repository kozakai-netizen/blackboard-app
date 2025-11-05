// lib/blackboard-layout.ts
// 黒板レイアウトの座標系・変換・高さ計算を統一管理

/**
 * 正規化座標系（0-1）
 * すべての座標・サイズをこの形式で扱う
 */
export type NormRect = {
  x: number;  // 0-1（左端が0、右端が1）
  y: number;  // 0-1（上端が0、下端が1）
  w: number;  // 0-1（幅）
  h: number;  // 0-1（高さ）
};

/**
 * ビューポート情報
 * Canvas/HTML要素の実際のサイズとDPR
 */
export type Viewport = {
  cssW: number;   // CSS表示幅（getBoundingClientRect）
  cssH: number;   // CSS表示高さ
  pxW: number;    // 実ピクセル幅（canvas.width）
  pxH: number;    // 実ピクセル高さ（canvas.height）
  dpr: number;    // デバイスピクセル比
};

/**
 * 高さ計算オプション
 */
export type HeightCalcOptions = {
  baseRate: number;      // 工事名の高さ比率（幅に対する比率）
  gridRate: number;      // グリッド項目の高さ比率
  gapRate: number;       // 項目間のギャップ比率
  padRate: number;       // パディング比率
  remarkRate: number;    // 備考の高さ比率
};

const DEFAULT_HEIGHT_OPTIONS: HeightCalcOptions = {
  baseRate: 0.12,
  gridRate: 0.09,
  gapRate: 0.02,
  padRate: 0.05,
  remarkRate: 0.15,
};

/**
 * 既存の%形式から正規化座標に変換（マイグレーション用）
 */
export const percentToNorm = (designSettings: {
  position: { x: number; y: number };
  width: number;
  height: number;
}): NormRect => ({
  x: designSettings.position.x / 100,
  y: designSettings.position.y / 100,
  w: designSettings.width / 100,
  h: designSettings.height / 100,
});

/**
 * 正規化座標から%形式に変換（既存API互換用）
 */
export const normToPercent = (rect: NormRect) => ({
  position: { x: rect.x * 100, y: rect.y * 100 },
  width: rect.w * 100,
  height: rect.h * 100,
});

/**
 * Canvas DPR対応初期化（方式A: CSS座標統一）
 *
 * この方式では、以降の描画座標はすべてCSS座標で指定できる
 * （内部的にDPRで自動スケーリング）
 */
export const initCanvasDPR = (canvas: HTMLCanvasElement): CanvasRenderingContext2D | null => {
  const rect = canvas.getBoundingClientRect();
  // ★ DPRを最低1に固定（ブラウザズーム対策）
  const dprRaw = window.devicePixelRatio || 1;
  const dpr = Math.max(1, dprRaw);

  // Canvas実ピクセルサイズをDPR倍に設定
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // CSS座標系で描画できるように変換行列を設定
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  console.log('Canvas DPR initialized:', {
    cssW: rect.width,
    cssH: rect.height,
    pxW: canvas.width,
    pxH: canvas.height,
    dprRaw,
    dpr: dpr,
    '⚠️ クランプ': dprRaw < 1 ? 'あり（1に補正）' : 'なし'
  });

  return ctx;
};

/**
 * Canvasから描画空間情報を取得
 * （方式A: CSS座標統一）
 */
export const toDrawSpace = (r: NormRect, cssW: number, cssH: number) => ({
  x: r.x * cssW,
  y: r.y * cssH,
  w: r.w * cssW,
  h: r.h * cssH,
});

/**
 * 正規化座標をCSS座標に変換（HTML要素配置用）
 */
export const toCss = (r: NormRect, cssW: number, cssH: number) => ({
  left: r.x * cssW,
  top: r.y * cssH,
  width: r.w * cssW,
  height: r.h * cssH,
});

/**
 * CSS座標（マウスイベント等）を正規化座標に変換
 */
export const pointCssToNorm = (
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } => ({
  x: (clientX - rect.left) / rect.width,
  y: (clientY - rect.top) / rect.height,
});

/**
 * 0-1の範囲にクランプ
 */
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/**
 * Canvasからビューポート情報を取得
 */
export const viewportFromCanvas = (canvas: HTMLCanvasElement): Viewport => {
  const rect = canvas.getBoundingClientRect();
  // ★ DPRを最低1に固定（ブラウザズーム対策）
  const dprRaw = window.devicePixelRatio || 1;
  const dpr = Math.max(1, dprRaw);
  return {
    cssW: rect.width,
    cssH: rect.height,
    pxW: canvas.width,
    pxH: canvas.height,
    dpr,
  };
};

/**
 * 黒板の必要な高さを計算（幅ベース）
 *
 * @param fields 表示フィールド一覧
 * @param bbWidthNorm 黒板の幅（正規化座標）
 * @param canvasWidthCss Canvasの表示幅（CSS座標）
 * @param canvasHeightCss Canvasの表示高さ（CSS座標）
 * @param designHeightNorm デザイン設定の高さ（正規化座標）
 * @param options 高さ計算オプション
 * @returns 確定した高さ（正規化座標）
 */
export const calculateBlackboardHeight = (
  fields: string[],
  bbWidthNorm: number,
  canvasWidthCss: number,
  canvasHeightCss: number,
  designHeightNorm: number,
  options: HeightCalcOptions = DEFAULT_HEIGHT_OPTIONS
): number => {
  // 黒板の実際の幅（CSS座標）を計算
  const bbWidthCss = bbWidthNorm * canvasWidthCss;

  // 工事名の高さ
  const baseHeight = bbWidthCss * options.baseRate;

  // その他の項目（工事名と備考を除く）
  const otherFields = fields.filter(f => f !== '工事名' && f !== '備考');
  const rowCount = Math.ceil(otherFields.length / 2); // 2列グリッド

  // グリッド項目の高さ
  const gridItemHeight = bbWidthCss * options.gridRate;

  // 備考の高さ
  const remarksHeight = fields.includes('備考') ? bbWidthCss * options.remarkRate : 0;

  // ギャップの合計
  const gapCount = Math.max(0, rowCount - 1) + (remarksHeight > 0 ? 1 : 0);
  const gaps = bbWidthCss * options.gapRate * gapCount;

  // 上下パディング
  const paddingVertical = bbWidthCss * options.padRate * 2;

  // 工事名とその他項目の間のギャップ
  const projectNameGap = rowCount > 0 ? bbWidthCss * 0.03 : 0;

  // 合計高さ（CSS座標）
  const calculatedHeightCss =
    paddingVertical +
    baseHeight +
    projectNameGap +
    rowCount * gridItemHeight +
    gaps +
    remarksHeight;

  // 正規化座標に変換
  const minHeightNorm = calculatedHeightCss / canvasHeightCss;

  // デザイン設定の高さと計算した高さの大きい方を使用
  const finalHeightNorm = Math.max(designHeightNorm, minHeightNorm);

  console.debug('[HEIGHT_CALC] 🔴 黒板高さ計算 (CSS座標基準)', {
    '黒板幅（CSS）': bbWidthCss.toFixed(2) + 'px',
    '計算された高さ（CSS）': calculatedHeightCss.toFixed(2) + 'px',
    '最小高さ（正規化）': minHeightNorm.toFixed(4),
    'デザイン設定高さ（正規化）': designHeightNorm.toFixed(4),
    '確定高さ（正規化）': finalHeightNorm.toFixed(4),
    'フィールド数': fields.length,
    '行数（2列グリッド）': rowCount,
    '入力座標系': `CSS (canvasWidthCss=${canvasWidthCss.toFixed(1)}px, canvasHeightCss=${canvasHeightCss.toFixed(1)}px)`
  });

  return finalHeightNorm;
};

/**
 * 黒板の最終矩形を計算（高さ自動調整付き）
 *
 * @param baseRect 基本矩形（正規化座標）
 * @param fields 表示フィールド
 * @param canvasWidthCss Canvas表示幅
 * @param canvasHeightCss Canvas表示高さ
 * @param options 高さ計算オプション
 * @returns 確定した矩形（正規化座標）
 */
export const resolveBlackboardRect = (
  baseRect: NormRect,
  fields: string[],
  canvasWidthCss: number,
  canvasHeightCss: number,
  options?: HeightCalcOptions
): NormRect => {
  const finalHeight = calculateBlackboardHeight(
    fields,
    baseRect.w,
    canvasWidthCss,
    canvasHeightCss,
    baseRect.h,
    options
  );

  // Y座標が画面外にはみ出す場合は調整
  let finalY = baseRect.y;
  const isAdjusted = finalY + finalHeight > 1.0;
  if (isAdjusted) {
    const originalY = finalY;
    finalY = Math.max(0, 1.0 - finalHeight);
    console.warn('[RESOLVE_RECT] ⚠️ Y座標を調整（画面外はみ出し防止）', {
      '元のY座標': originalY.toFixed(4),
      '調整後Y座標': finalY.toFixed(4),
      '高さ': finalHeight.toFixed(4)
    });
  }

  const result = {
    x: baseRect.x,
    y: finalY,
    w: baseRect.w,
    h: finalHeight,
  };

  console.debug('[RESOLVE_RECT] 🔴 最終矩形確定 (正規化座標)', {
    '入力矩形': baseRect,
    '確定矩形': result,
    'Y座標調整': isAdjusted ? 'あり' : 'なし',
    '座標系': '正規化 (0-1)'
  });

  return result;
};

/**
 * ドラッグ操作用フック（Pointer Events + rAF）
 */
export const useDragNormLogic = () => {
  let rafId = 0;
  let pendingPos: { x: number; y: number } | null = null;

  const scheduleUpdate = (callback: () => void) => {
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        callback();
      });
    }
  };

  const cancelUpdate = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  return { scheduleUpdate, cancelUpdate, getPendingPos: () => pendingPos, setPendingPos: (pos: { x: number; y: number } | null) => { pendingPos = pos; } };
};

/**
 * Fit型（画像の描画領域）
 */
export type Fit = { dx: number; dy: number; drawW: number; drawH: number };

/**
 * フィールド数に基づいて黒板の内側コンテンツ高さを計算（Fit基準・新版）
 *
 * GPT先生の指摘を反映:
 * - safeArea（パディング・SHA-256余白）を含まない「純粋なコンテンツ高さ」のみを返す
 * - 外枠高さへの変換は呼び出し側で逆算式を使用
 * - 動的に列数を指定可能（1-4列）
 *
 * @param fields - 表示するフィールドのリスト
 * @param bbWidthNorm - 黒板の幅（0..1の正規化値）
 * @param fit - 画像の描画領域（物理ピクセル）
 * @param columns - グリッド列数（デフォルト: 2）
 * @returns 正規化された内側コンテンツ高さ（0..1）
 */
export function calcContentHeightNormFromFit(
  fields: string[],
  bbWidthNorm: number,
  fit: Fit,
  columns: number = 2
): number {
  // 黒板の実ピクセル幅
  const bbWpx = Math.max(1, bbWidthNorm * fit.drawW);

  let hpx = 0; // パディングは含めない！

  // 工事名（全幅）
  if (fields.includes('工事名')) {
    hpx += bbWpx * 0.12; // タイトル行
    hpx += bbWpx * 0.03; // ギャップ
  }

  // その他の項目（動的列数グリッド）
  const others = fields.filter(f => f !== '工事名' && f !== '備考');
  if (others.length > 0) {
    const cols = Math.min(4, Math.max(1, columns));
    const rows = Math.ceil(others.length / cols);
    hpx += rows * (bbWpx * 0.09); // 各行
    hpx += Math.max(0, rows - 1) * (bbWpx * 0.02); // 行間ギャップ
  }

  // 備考（全幅）
  if (fields.includes('備考')) {
    hpx += bbWpx * 0.03; // ギャップ
    hpx += bbWpx * 0.15; // 備考枠
  }

  // SHA-256余白は含めない！（safeArea.bottomで管理）

  // 正規化高さ（fit.drawH基準）で返す
  return hpx / fit.drawH;
}

/**
 * フィールド数に基づいて黒板の最小高さを計算（Fit基準・旧版）
 *
 * ⚠️ 後方互換性のために残す
 * この関数は外枠高さ（パディング+SHA-256余白込み）を返す
 * 新規実装では calcContentHeightNormFromFit() を使用すること
 *
 * @param fields - 表示するフィールドのリスト
 * @param bbWidthNorm - 黒板の幅（0..1の正規化値）
 * @param fit - 画像の描画領域（物理ピクセル）
 * @returns 正規化された高さ（0..1）
 */
export function calcMinHeightNormFromFit(
  fields: string[],
  bbWidthNorm: number,
  fit: Fit
): number {
  // 黒板の実ピクセル幅（高さではなく幅ベースで一貫）
  const bbWpx = bbWidthNorm * fit.drawW;

  let hpx = bbWpx * 0.05 * 2; // 上下余白

  // 工事名（全幅）
  if (fields.includes('工事名')) {
    hpx += bbWpx * 0.12; // タイトル行
    hpx += bbWpx * 0.03; // ギャップ
  }

  // その他の項目（2列グリッド）
  const others = fields.filter(f => f !== '工事名' && f !== '備考');
  if (others.length) {
    const rows = Math.ceil(others.length / 2);
    hpx += rows * (bbWpx * 0.09); // 各行
    hpx += Math.max(0, rows - 1) * (bbWpx * 0.02); // 行間ギャップ
  }

  // 備考（全幅）
  if (fields.includes('備考')) {
    hpx += bbWpx * 0.03; // ギャップ
    hpx += bbWpx * 0.15; // 備考枠
  }

  // SHA-256行のための下余白（必ず確保）
  hpx += bbWpx * 0.10;

  // 正規化高さ（fit.drawH基準）で返す
  return hpx / fit.drawH;
}

/**
 * 正規化座標を描画空間の座標に変換（Fit基準）
 */
export function toDrawSpaceRectFromNorm(
  norm: { x: number; y: number; w: number; h: number },
  fit: Fit
) {
  return {
    x: Math.round(fit.dx + norm.x * fit.drawW),
    y: Math.round(fit.dy + norm.y * fit.drawH),
    w: Math.max(1, Math.round(norm.w * fit.drawW)),
    h: Math.max(1, Math.round(norm.h * fit.drawH)),
  };
}
