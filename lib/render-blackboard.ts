// lib/render-blackboard.ts
// 統一ファサード：旧/新どちらのテンプレートでも新レイアウトシステムで描画
import type { Template, BlackboardInfo } from '@/types';
import type { Layout } from '@/types/layouts';
import { resolveLayoutConfigFromTemplate } from '@/lib/layout-adapter';
import { resolveBlackboardRectFromLayout } from '@/lib/layout-utils';
import { blackboardInfoToFieldValue } from '@/lib/draw-with-layout';
import { drawRemarks } from '@/lib/canvas/drawRemarks';

/**
 * 旧呼び出し互換のラッパー（引数そのまま）
 * 既存の drawTemplateBlackboardNew と同じシグネチャ
 *
 * - Union型には一切触れず、型エラーゼロ
 * - 旧/新どちらも LayoutConfig に正規化して描画
 * - 外枠のみ塗る（safeArea保護）
 * - SHA-256 は innerPx 右下基準
 *
 * @param ctx - Canvas描画コンテキスト
 * @param blackboardInfo - 黒板データ
 * @param canvasW - Canvas幅
 * @param canvasH - Canvas高さ
 * @param template - テンプレート（旧/新どちらでもOK）
 * @param dx - Fit領域のX offset
 * @param dy - Fit領域のY offset
 * @param drawW - Fit領域の幅
 * @param drawH - Fit領域の高さ
 */
export async function renderBlackboardCompat(
  ctx: CanvasRenderingContext2D,
  blackboardInfo: unknown,
  canvasW: number,
  canvasH: number,
  template: Template | undefined,
  dx: number,
  dy: number,
  drawW: number,
  drawH: number
) {
  // テンプレートなしの場合は何も描画しない（後方互換性のためエラーを出さない）
  if (!template) {
    console.warn('⚠️ renderBlackboardCompat: テンプレートなし、描画をスキップ');
    return;
  }

  // ★デバッグログ: blackboardInfoの中身を確認
  console.log('[RENDER_COMPAT] 🔍 blackboardInfo受信:', {
    template: template.name,
    blackboardInfo,
    fields: template.fields
  });

  // 1) 旧/新問わず LayoutConfig に正規化
  const { cfg, source } = resolveLayoutConfigFromTemplate(template);

  // ★ Patch 5: レガシーテンプレートの高さ・位置を優先（動的計算を無効化）
  if (source === 'legacy') {
    const ds = template.designSettings as any;
    if (ds && typeof ds.height === 'number' && typeof ds.position?.y === 'number') {
      // パーセント値を正規化座標に変換（0-1）
      const pct = (v: number) => Math.max(0, Math.min(1, v > 1 ? v / 100 : v));
      cfg.board.h = pct(ds.height);
      cfg.board.y = pct(ds.position.y);

      console.log('[LEGACY_OVERRIDE] ユーザー指定の高さ・位置を強制適用:', {
        height: `${ds.height}% → ${cfg.board.h}`,
        y: `${ds.position.y}% → ${cfg.board.y}`
      });
    }
  }

  // 2) 互換 Fit を組み立て
  const fit = { dx, dy, drawW, drawH, scale: 1 };

  // 3) 即席のレイアウトオブジェクトで統一描画
  const inlineLayout: Layout = {
    id: 'inline',
    name: 'inline',
    description: '',
    layout_key: 'inline',
    config: cfg,
    thumbnail_url: null,
    version: 1,
    usage_count: 0,
    is_system: false,
    display_order: 0,
    created_at: '',
    updated_at: '',
  };

  // 4) outerPx / innerPx を計算
  const { outerPx, innerPx } = resolveBlackboardRectFromLayout(
    template,
    inlineLayout,
    fit
  );

  // 5) テーマ色取得
  const variant = cfg.style?.variant ?? 'green';
  const opacity = cfg.style?.opacity ?? 0.92;
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  const bgColor = cfg.style?.bgColor ?? (variant === 'green' ? `#1a5f3f${alpha}` : `#2a2a2a${alpha}`);
  const textColor = cfg.style?.textColor ?? '#FFFFFF';
  const borderColor = 'rgba(255, 255, 255, 0.5)';

  // 6) 外枠描画（半透明で塗る、safeArea含む外枠全体）
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = bgColor;
  ctx.fillRect(outerPx.x, outerPx.y, outerPx.w, outerPx.h);
  ctx.globalAlpha = 1.0; // 透明度をリセット
  ctx.restore();

  // 7) 黒板内容描画（innerPxに描画、内側は塗らない = safeArea保護）
  await drawBlackboardContent(ctx, innerPx, blackboardInfo as BlackboardInfo, template, cfg, textColor, borderColor);

  // 8) SHA-256マーク描画（innerPx右下から）
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `${innerPx.w * 0.025}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(
    'SHA-256',
    innerPx.x + innerPx.w - innerPx.w * 0.02,
    innerPx.y + innerPx.h - innerPx.w * 0.01
  );
  ctx.textAlign = 'left';
  ctx.restore();
}

/**
 * 黒板内容描画（テキスト・罫線のみ、innerは塗らない）
 */
async function drawBlackboardContent(
  ctx: CanvasRenderingContext2D,
  innerPx: { x: number; y: number; w: number; h: number },
  blackboardInfo: BlackboardInfo,
  template: Template,
  cfg: any,
  textColor: string,
  borderColor: string
) {
  const { x: innerX, y: innerY, w: innerW, h: innerH } = innerPx;
  const { grid, typography } = cfg;

  ctx.save();

  // 外周枠（罫線）
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1, Math.floor(innerH * 0.01));
  ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerW - 1, innerH - 1);

  // ベースフォントサイズ（黒板幅基準）
  const baseFontSize = innerW * (typography?.base ?? 0.055);
  const titleFontSize = baseFontSize * (typography?.scaleTitle ?? 1.10);

  let currentY = innerY + innerH * 0.05; // 上部余白

  // フィールドデータ取得ヘルパー
  const getData = (label: string): string =>
    blackboardInfoToFieldValue(label, blackboardInfo);

  ctx.fillStyle = textColor;

  // 1. タイトル描画（工事名など）
  const titleField = template.fields.find(f => f === '工事名' || f === 'タイトル');
  if (titleField) {
    const titleText = getData(titleField);
    const titlePlacement = grid?.titlePlacement ?? 'top-full-width';

    if (titlePlacement === 'top-full-width') {
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.fillText(titleText, innerX + innerW * 0.03, currentY + titleFontSize);
      currentY += titleFontSize + innerW * 0.03;
    } else if (titlePlacement === 'top-center') {
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(titleText, innerX + innerW / 2, currentY + titleFontSize);
      ctx.textAlign = 'left';
      currentY += titleFontSize + innerW * 0.03;
    } else if (titlePlacement === 'top-left') {
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.fillText(titleText, innerX + innerW * 0.03, currentY + titleFontSize);
      currentY += titleFontSize + innerW * 0.03;
    }
  }

  // 2. グリッド項目描画（備考以外）- 越境防止版
  const otherFields = template.fields.filter(f =>
    f !== '工事名' && f !== 'タイトル' && f !== '備考'
  );

  if (otherFields.length > 0) {
    const columns = grid?.columns ?? 2;
    const gap = innerW * (grid?.gap ?? 0.02);
    const itemWidth = (innerW - innerW * 0.06 - gap * (columns - 1)) / columns;
    const itemHeight = baseFontSize * 2.2;

    const rows = Math.ceil(otherFields.length / columns);

    // テキスト省略ヘルパー
    const truncateText = (text: string, maxWidth: number, font: string): string => {
      ctx.font = font;
      if (ctx.measureText(text).width <= maxWidth) return text;

      let truncated = text;
      while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      return truncated + '…';
    };

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index >= otherFields.length) break; // ★越境防止

        const field = otherFields[index];
        const value = getData(field);

        const itemX = innerX + innerW * 0.03 + col * (itemWidth + gap);
        const itemY = currentY + row * (itemHeight + gap);
        const itemRightEdge = itemX + itemWidth; // セルの右端

        // ラベル描画
        const labelFont = `${baseFontSize * 0.8}px sans-serif`;
        ctx.font = labelFont;
        const labelText = `${field}:`;
        const labelWidth = ctx.measureText(labelText).width;
        ctx.fillText(labelText, itemX, itemY + baseFontSize);

        // 値描画の開始位置（ラベル直後 + 小さな余白）
        const valueStartX = itemX + labelWidth + baseFontSize * 0.2;
        const valueMaxWidth = itemRightEdge - valueStartX - baseFontSize * 0.1; // 右端余白も確保

        // 値描画（省略処理付き）
        const valueFont = `${baseFontSize}px sans-serif`;
        const truncatedValue = truncateText(value, valueMaxWidth, valueFont);
        ctx.font = valueFont;
        ctx.fillText(truncatedValue, valueStartX, itemY + baseFontSize + baseFontSize * 1.1);
      }
    }

    currentY += rows * (itemHeight + gap);
  }

  // 3. 備考欄描画（新しいdrawRemarks関数を使用）
  if (template.fields.includes('備考')) {
    const remarksText = getData('備考');
    if (remarksText) {
      const pad = innerW * 0.03;
      const lineGap = baseFontSize * 0.35;
      const leftX = innerX + pad;
      const rightLimit = innerX + innerW - pad;
      const usableWidth = rightLimit - leftX;
      const bottomBoundary = innerY + innerH - innerW * 0.02;

      // 見出し「備考」
      ctx.font = `${baseFontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('備考', leftX, currentY + baseFontSize);

      // 備考本文の描画領域
      const remarksY = currentY + baseFontSize + lineGap;
      const remarksBox = {
        x: leftX,
        y: remarksY,
        w: usableWidth,
        h: bottomBoundary - remarksY,
      };

      // 新しいdrawRemarks関数で描画
      drawRemarks(ctx, remarksText, remarksBox, {
        maxLines: 2,
        font: `${baseFontSize}px sans-serif`,
        lineHeight: baseFontSize * 1.1,
        overflowRatio: 0.05,
        debug: process.env.NODE_ENV !== "production",
        color: textColor,
      });

      currentY = remarksY + remarksBox.h;
    }
  }

  ctx.restore();
}
