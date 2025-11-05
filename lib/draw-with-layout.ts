// lib/draw-with-layout.ts
// 新レイアウトシステムの描画関数（修正版）

import type { BlackboardInfo, Template } from '@/types';
import type { LayoutConfig, Layout } from '@/types/layouts';
import { resolveBlackboardRectFromLayout } from './layout-utils';

/**
 * BlackboardInfo型の定義（型安全のため明示）
 */
type BlackboardInfoType = {
  projectName: string;
  timestamp: Date | string;
  workType?: string;
  workCategory?: string;  // ADD: 種別（FIELD_ALIAS対応）
  workDetail?: string;    // ADD: 細別（FIELD_ALIAS対応）
  weather?: string;
  contractor?: string;    // ADD: 施工者（FIELD_ALIAS対応）
  location?: string;
  station?: string;       // ADD: 測点位置（FIELD_ALIAS対応）
  witness?: string;       // ADD: 立会者（FIELD_ALIAS対応）
  supervisor?: string;
  subSupervisor?: string;
  remarks?: string;
  [key: string]: any; // その他のフィールド対応
};

// フィールド名の揺れを吸収するエイリアス辞書
const FIELD_ALIAS: Record<string, keyof BlackboardInfoType> = {
  '工事名': 'projectName',
  '工種': 'workType',
  '天候': 'weather',
  '種別': 'workCategory',
  '細別': 'workDetail',
  '施工者': 'contractor',
  '撮影場所': 'location',
  '場所': 'location',
  '測点位置': 'station',
  '立会者': 'witness',
  '立合者': 'witness',  // ← 揺れ対応
  '備考': 'remarks',
  '撮影日時': 'timestamp',
  '撮影日': 'timestamp',
  '日時': 'timestamp',
  '管理担当者': 'supervisor',
  'サブ担当者': 'subSupervisor',
};

/**
 * テンプレートの表示ラベル → BlackboardInfo のプロパティ値へマッピング
 */
export function blackboardInfoToFieldValue(label: string, info: BlackboardInfo): string {
  const data = info as BlackboardInfoType;
  const key = FIELD_ALIAS[label];

  console.log(`[FIELD_MAP] label="${label}" → key="${key}" → value=`, data[key as keyof typeof data]);

  if (!key) {
    // エイリアスに無い場合は直接アクセスを試みる
    const directValue = (data as any)[label];
    console.log(`[FIELD_MAP] Direct access: "${label}" →`, directValue);
    return String(directValue ?? '');
  }

  const value = data[key];

  // 日付型の特別処理
  if (key === 'timestamp' && value) {
    return new Date(value).toLocaleDateString('ja-JP');
  }

  return value == null ? '' : String(value);
}

/**
 * variant → 色テーマ変換ヘルパー
 */
function themeFromVariant(variant: 'green' | 'black', opacity: number) {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');

  if (variant === 'green') {
    return {
      bgColor: `#1a5f3f${alpha}`,    // 緑黒板
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.5)'
    };
  } else {
    return {
      bgColor: `#2a2a2a${alpha}`,    // 黒黒板
      textColor: '#FFFFFF',
      borderColor: 'rgba(255, 255, 255, 0.5)'
    };
  }
}

/**
 * 共通の黒板内容描画ロジック
 * @param ctx - Canvas描画コンテキスト
 * @param innerPx - 内側領域（safeArea除く実描画エリア）
 * @param blackboardInfo - 黒板データ
 * @param template - テンプレート
 * @param config - レイアウト設定
 * @param fillInner - 内側を塗りつぶすか（デフォルト: false、safeArea保護のため）
 */
function drawBoardContent(
  ctx: CanvasRenderingContext2D,
  innerPx: { x: number; y: number; w: number; h: number },
  blackboardInfo: BlackboardInfo,
  template: Template,
  config: LayoutConfig,
  fillInner: boolean = false
) {
  const { x: innerX, y: innerY, w: innerW, h: innerH } = innerPx;
  const { grid, typography, style } = config;

  // テーマ色取得（スタイルオーバーライド優先）
  const theme = themeFromVariant(style.variant, style.opacity);
  const textColor = style.textColor || theme.textColor;
  const borderColor = theme.borderColor;

  ctx.save();

  // ★ 内側はデフォルト塗らない（safeAreaを保護）
  if (fillInner) {
    const bgColor = style.bgColor || theme.bgColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(innerX, innerY, innerW, innerH);
  }

  // 外周枠（罫線）
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(1, Math.floor(innerH * 0.01));
  ctx.strokeRect(innerX + 0.5, innerY + 0.5, innerW - 1, innerH - 1);

  // ベースフォントサイズ（黒板幅基準）
  const baseFontSize = innerW * typography.base;
  const titleFontSize = baseFontSize * (typography.scaleTitle || 1.0);

  let currentY = innerY + innerH * 0.05; // 上部余白

  // フィールドデータ取得ヘルパー（修正版）
  const getData = (label: string): string =>
    blackboardInfoToFieldValue(label, blackboardInfo);

  ctx.fillStyle = textColor;

  // 1. タイトル描画（工事名など）
  const titleField = template.fields.find(f => f === '工事名' || f === 'タイトル');
  if (titleField) {
    const titleText = getData(titleField);

    if (grid.titlePlacement === 'top-full-width') {
      // 全幅表示
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.fillText(titleText, innerX + innerW * 0.03, currentY + titleFontSize);
      currentY += titleFontSize + innerW * 0.03;
    } else if (grid.titlePlacement === 'top-center') {
      // 中央表示
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(titleText, innerX + innerW / 2, currentY + titleFontSize);
      ctx.textAlign = 'left';
      currentY += titleFontSize + innerW * 0.03;
    } else if (grid.titlePlacement === 'top-left') {
      // 左寄せ
      ctx.font = `bold ${titleFontSize}px sans-serif`;
      ctx.fillText(titleText, innerX + innerW * 0.03, currentY + titleFontSize);
      currentY += titleFontSize + innerW * 0.03;
    }
    // 'left-side' の場合は別途実装（現状未対応）
  }

  // 2. グリッド項目描画（備考以外）- 越境防止版
  const otherFields = template.fields.filter(f =>
    f !== '工事名' && f !== 'タイトル' && f !== '備考'
  );

  if (otherFields.length > 0) {
    const columns = grid.columns;
    const gap = innerW * grid.gap;
    const itemWidth = (innerW - innerW * 0.06 - gap * (columns - 1)) / columns;
    const itemHeight = baseFontSize * 2.2; // 項目高さ

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

  // 3. 備考欄描画（複数行＋縮小＋省略の三段構え）
  if (template.fields.includes('備考')) {
    const remarksText = getData('備考');
    if (remarksText) {
      // 日本語テキスト折り返しヘルパー
      function wrapJP(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
        const lines: string[] = [];
        let buf = '';
        for (const ch of text) {
          const next = buf + ch;
          if (ctx.measureText(next).width <= maxWidth) {
            buf = next;
          } else {
            if (buf) lines.push(buf);
            buf = ch;
          }
        }
        if (buf) lines.push(buf);
        return lines;
      }

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

      // 本文用フォントサイズ（必要に応じて縮小）
      let fs = baseFontSize;
      const fsMin = Math.max(baseFontSize * 0.6, 10);
      let lines: string[] = [];
      let lineHeight = fs * 1.1;

      // フォントサイズを調整しつつ収まる行数で試す
      for (;;) {
        ctx.font = `${fs}px sans-serif`;
        lines = wrapJP(ctx, remarksText, usableWidth);
        lineHeight = fs * 1.1;

        const titleBlockHeight = baseFontSize;
        const textBlockHeight = lines.length * lineHeight;
        const need = currentY + titleBlockHeight + lineGap + textBlockHeight;

        if (need <= bottomBoundary || fs <= fsMin) break;
        fs = Math.max(fs - 1, fsMin);
      }

      // それでも下端に当たるなら、入るだけ描いて末尾を省略（…）
      ctx.font = `${fs}px sans-serif`;
      const maxLines = Math.floor((bottomBoundary - (currentY + baseFontSize + lineGap)) / lineHeight);

      let out = lines;
      if (lines.length > maxLines && maxLines > 0) {
        out = lines.slice(0, maxLines);
        // 最終行の末尾に…（はみ出す場合は1文字落として…）
        const last = out[out.length - 1] ?? '';
        let ell = last + '…';
        while (ctx.measureText(ell).width > usableWidth && ell.length > 1) {
          ell = ell.slice(0, -2) + '…';
        }
        out[out.length - 1] = ell;
      }

      // 描画
      let y = currentY + baseFontSize + lineGap;
      for (const ln of out) {
        if (y + fs > bottomBoundary) break;
        ctx.fillText(ln, leftX, y + fs);
        y += lineHeight;
      }

      currentY = y;
    }
  }

  ctx.restore();
}

/**
 * 新レイアウトシステム：fit型でCanvas描画（BlackboardPreview.tsx用）
 *
 * @param ctx - Canvas描画コンテキスト
 * @param blackboardInfo - 黒板データ
 * @param canvasW - Canvas幅
 * @param canvasH - Canvas高さ
 * @param template - テンプレート（layout_id必須）
 * @param fit - fit型 { dx, dy, drawW, drawH, scale }
 */
export function drawTemplateBlackboardWithLayout(
  ctx: CanvasRenderingContext2D,
  blackboardInfo: BlackboardInfo,
  canvasW: number,
  canvasH: number,
  template: Template,
  fit: { dx: number; dy: number; drawW: number; drawH: number; scale: number }
) {
  if (!template.layout_id) {
    console.error('❌ template.layout_idが未設定です');
    return;
  }

  // テンプレートからLayoutを取得（仮想的なLayoutオブジェクトを作成）
  // 実際には、template.designSettingsがLayoutConfigとして機能する
  const layoutConfig = template.designSettings as Partial<LayoutConfig> | null;

  if (!layoutConfig || !layoutConfig.board || !layoutConfig.grid || !layoutConfig.typography || !layoutConfig.style) {
    console.error('❌ LayoutConfigが不完全です', layoutConfig);
    return;
  }

  const config = layoutConfig as LayoutConfig;

  // ★ 修正: 仮想Layoutオブジェクトを作成してresolveBlackboardRectFromLayoutに渡す
  // 実際のアプリではDBからLayoutを取得するが、ここではtemplate.design_settingsを使用
  const virtualLayout: Layout = {
    id: template.layout_id,
    name: 'Virtual Layout',
    description: null,
    layout_key: 'virtual',
    config: config,
    thumbnail_url: null,
    version: 1,
    usage_count: 0,
    is_system: false,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // ★ 修正: 正しい引数順でFit型を構築して渡す
  const fitForLayout = {
    dx: fit.dx,
    dy: fit.dy,
    drawW: fit.drawW,
    drawH: fit.drawH,
    scale: fit.scale
  };

  // outerPx / innerPx を計算
  const { outerPx, innerPx } = resolveBlackboardRectFromLayout(
    template,
    virtualLayout,
    fitForLayout
  );

  // fit.dx, fit.dy オフセット適用
  const finalOuterPx = {
    x: outerPx.x + fit.dx,
    y: outerPx.y + fit.dy,
    w: outerPx.w,
    h: outerPx.h
  };

  const finalInnerPx = {
    x: innerPx.x + fit.dx,
    y: innerPx.y + fit.dy,
    w: innerPx.w,
    h: innerPx.h
  };

  // ★ 赤ランプログ: outerPx/innerPx の包含関係チェック
  console.debug('[LAYOUT] 🔴 outerPx/innerPx 検証', {
    outerPx: finalOuterPx,
    innerPx: finalInnerPx,
    fit,
    config,
    '包含チェック': {
      'innerX >= outerX': finalInnerPx.x >= finalOuterPx.x,
      'innerY >= outerY': finalInnerPx.y >= finalOuterPx.y,
      'innerR <= outerR': (finalInnerPx.x + finalInnerPx.w) <= (finalOuterPx.x + finalOuterPx.w),
      'innerB <= outerB': (finalInnerPx.y + finalInnerPx.h) <= (finalOuterPx.y + finalOuterPx.h)
    }
  });

  // ★ 修正: 外枠描画（半透明で塗る、safeArea含む外枠全体）
  ctx.save();
  const theme = themeFromVariant(config.style.variant, config.style.opacity);
  const bgColor = config.style.bgColor || theme.bgColor;

  // 外枠全体を半透明で塗る
  ctx.globalAlpha = config.style.opacity;
  ctx.fillStyle = bgColor;
  ctx.fillRect(finalOuterPx.x, finalOuterPx.y, finalOuterPx.w, finalOuterPx.h);
  ctx.globalAlpha = 1.0; // 透明度をリセット

  ctx.restore();

  // ★ 修正: 黒板内容描画（innerPxに描画、fillInner=false でsafeArea保護）
  drawBoardContent(ctx, finalInnerPx, blackboardInfo, template, config, false);

  // SHA-256マーク描画（innerPx右下から）
  ctx.save();
  ctx.fillStyle = theme.textColor;
  ctx.font = `${finalInnerPx.w * 0.025}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(
    'SHA-256',
    finalInnerPx.x + finalInnerPx.w - finalInnerPx.w * 0.02,
    finalInnerPx.y + finalInnerPx.h - finalInnerPx.w * 0.01
  );
  ctx.textAlign = 'left';
  ctx.restore();

  console.debug('✅ drawTemplateBlackboardWithLayout完了', {
    outerPx: finalOuterPx,
    innerPx: finalInnerPx,
    config
  });
}

/**
 * 新レイアウトシステム：スプライト描画（PreviewModal.tsx用）
 * Canvas全体を黒板で埋める（fit計算なし）
 *
 * @param ctx - Sprite Canvas描画コンテキスト
 * @param blackboardInfo - 黒板データ
 * @param template - テンプレート（layout_id必須）
 * @param spriteW - スプライト幅
 * @param spriteH - スプライト高さ
 */
export function drawTemplateBlackboardOnSpriteWithLayout(
  ctx: CanvasRenderingContext2D,
  blackboardInfo: BlackboardInfo,
  template: Template,
  spriteW: number,
  spriteH: number
) {
  if (!template.layout_id) {
    console.error('❌ template.layout_idが未設定です');
    return;
  }

  const layoutConfig = template.designSettings as Partial<LayoutConfig> | null;

  if (!layoutConfig || !layoutConfig.board || !layoutConfig.grid || !layoutConfig.typography || !layoutConfig.style) {
    console.error('❌ LayoutConfigが不完全です', layoutConfig);
    return;
  }

  const config = layoutConfig as LayoutConfig;

  // ★ 修正: 仮想Layoutオブジェクトを作成
  const virtualLayout: Layout = {
    id: template.layout_id,
    name: 'Virtual Layout',
    description: null,
    layout_key: 'virtual',
    config: config,
    thumbnail_url: null,
    version: 1,
    usage_count: 0,
    is_system: false,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // スプライト全体を使用（fit計算なし、Canvas全体を描画領域として扱う）
  const fitForSprite = {
    dx: 0,
    dy: 0,
    drawW: spriteW,
    drawH: spriteH,
    scale: 1
  };

  const { outerPx, innerPx } = resolveBlackboardRectFromLayout(
    template,
    virtualLayout,
    fitForSprite
  );

  // ★ 修正: 外枠描画（半透明で塗る）
  ctx.save();
  const theme = themeFromVariant(config.style.variant, config.style.opacity);
  const bgColor = config.style.bgColor || theme.bgColor;

  ctx.globalAlpha = config.style.opacity;
  ctx.fillStyle = bgColor;
  ctx.fillRect(outerPx.x, outerPx.y, outerPx.w, outerPx.h);
  ctx.globalAlpha = 1.0;

  ctx.restore();

  // ★ 修正: 黒板内容描画（fillInner=false）
  drawBoardContent(ctx, innerPx, blackboardInfo, template, config, false);

  // SHA-256マーク描画
  ctx.save();
  ctx.fillStyle = theme.textColor;
  ctx.font = `${innerPx.w * 0.025}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(
    'SHA-256',
    innerPx.x + innerPx.w - innerPx.w * 0.02,
    innerPx.y + innerPx.h - innerPx.w * 0.01
  );
  ctx.textAlign = 'left';
  ctx.restore();

  console.debug('✅ drawTemplateBlackboardOnSpriteWithLayout完了', {
    outerPx,
    innerPx,
    config
  });
}
