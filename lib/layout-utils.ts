// lib/layout-utils.ts
// レイアウトとテンプレートの合成ロジック（GPT先生の指摘を反映）

import type { Template } from '@/types';
import type { LayoutConfig, Layout, Anchor } from '@/types/layouts';
import { anchorToTopLeft } from '@/types/layouts';
import type { Fit } from '@/lib/blackboard-layout';
import { calcContentHeightNormFromFit } from '@/lib/blackboard-layout';

/**
 * レイアウトとテンプレートのdesignSettingsを深くマージ
 * テンプレート側の設定を優先（オーバーライド）
 */
export function deepMergeLayout(
  baseLayout: LayoutConfig,
  templateOverride?: Template['designSettings']
): LayoutConfig {
  if (!templateOverride) return baseLayout;

  // 型ガード: BlackboardDesignSettings（旧形式）の場合は何もマージせずbaseLayoutを返す
  if ('position' in templateOverride && 'width' in templateOverride && typeof templateOverride.style === 'string') {
    // 旧形式なのでマージ不可、baseLayoutをそのまま返す
    console.warn('⚠️ 旧形式のBlackboardDesignSettingsが渡されました。LayoutConfigではないためマージできません。');
    return baseLayout;
  }

  // 型アサーション: 型ガード後はLayoutConfig確定
  const override = templateOverride as LayoutConfig;

  return {
    board: {
      ...baseLayout.board,
      ...(override.board || {})
    },
    grid: {
      ...baseLayout.grid,
      ...(override.grid || {})
    },
    typography: {
      ...baseLayout.typography,
      ...(override.typography || {})
    },
    safeArea: {
      ...baseLayout.safeArea,
      ...(override.safeArea || {})
    },
    style: {
      ...baseLayout.style,
      ...(override.style || {})
    }
  } as LayoutConfig;
}

/**
 * フィールド数に基づいて黒板の必要最小高さを計算（正規化座標で返す）
 *
 * GPT先生の最終修正版:
 * - calcContentHeightNormFromFit() で内側コンテンツ高さのみを取得
 * - 逆算式で外枠高さを計算: 外枠高さ = 内側高さ / (1 - top - bottom)
 * - 動的列数をLayoutConfig.grid.columnsから取得
 *
 * @param cfg - レイアウト設定
 * @param fields - 表示フィールドリスト
 * @param fit - Fit領域情報
 * @returns 正規化された外枠高さ（0-1）
 */
export function resolveBoardHeightNorm(
  cfg: LayoutConfig,
  fields: string[],
  fit: Fit
): number {
  const safe = cfg.safeArea ?? { top: 0, bottom: 0, left: 0, right: 0 };

  // 内側幅を計算（正規化座標）
  const innerWidthNorm = Math.max(
    0.0001,
    cfg.board.w * (1 - (safe.left ?? 0) - (safe.right ?? 0))
  );

  // 動的列数を取得（1-4列）
  const columns = cfg.grid.columns || 2;

  // 内側に必要な高さを新関数で計算（正規化座標、safeArea含まず）
  const hContentInner = calcContentHeightNormFromFit(fields, innerWidthNorm, fit, columns);

  // 内側高さ = 外枠高さ * (1 - top - bottom)
  // → 外枠高さ = 内側高さ / (1 - top - bottom)
  const denom = Math.max(0.0001, 1 - (safe.top ?? 0) - (safe.bottom ?? 0));
  const hOuterNeeded = hContentInner / denom;

  // 外枠の最終高さ（最小値: cfg.board.h）
  const hOuterFinal = Math.max(cfg.board.h, hOuterNeeded);

  return Math.min(0.95, hOuterFinal);  // 画面外に出ないように上限設定
}

/**
 * 正規化座標をFit領域の物理ピクセル座標に変換
 */
export function normRectToDrawSpace(
  norm: { x: number; y: number; w: number; h: number },
  fit: Fit
) {
  return {
    x: Math.round(fit.dx + norm.x * fit.drawW),
    y: Math.round(fit.dy + norm.y * fit.drawH),
    w: Math.max(1, Math.round(norm.w * fit.drawW)),
    h: Math.max(1, Math.round(norm.h * fit.drawH))
  };
}

/**
 * テンプレートとレイアウトから最終的な黒板矩形を取得
 * GPT先生の指摘に基づき、outerPx（外枠）とinnerPx（内側）を返すように変更
 *
 * ⚠️ 関数名衝突を避けるため、blackboard-layout.tsのresolveBlackboardRect()とは別名
 *
 * @param template - テンプレート
 * @param layout - レイアウト
 * @param fit - Fit領域情報
 * @returns { outerPx: 外枠（物理px）, innerPx: 内側（物理px） }
 */
export function resolveBlackboardRectFromLayout(
  template: Template,
  layout: Layout,
  fit: Fit
): { outerPx: { x: number; y: number; w: number; h: number }; innerPx: { x: number; y: number; w: number; h: number } } {
  // 1. レイアウト設定を使用（すでにマージ済みまたは上書き済み）
  // ★ Patch 5: render-blackboard.tsで既に cfg を上書き済みなので、
  // template.designSettings を再マージせず、layout.config をそのまま使う
  const finalLayout = layout.config;

  // 2. 外枠高さを確定
  // ★ Patch 5: レガシーテンプレートの場合、render-blackboard.tsで上書きした高さをそのまま使用
  const hOuterNorm = finalLayout.board.h;

  // 3. アンカーを左上座標に変換（正規化座標）
  const outerNormTopLeft = anchorToTopLeft({
    x: finalLayout.board.x,
    y: finalLayout.board.y,
    w: finalLayout.board.w,
    h: hOuterNorm,
    anchor: finalLayout.board.anchor
  });

  const outerNorm = {
    x: outerNormTopLeft.x,
    y: outerNormTopLeft.y,
    w: finalLayout.board.w,
    h: hOuterNorm
  };

  // 4. 物理ピクセル座標に変換（外枠）
  const outerPx = normRectToDrawSpace(outerNorm, fit);

  // 5. safeAreaで内側を計算（物理px）
  const safe = finalLayout.safeArea ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const innerPx = {
    x: Math.round(outerPx.x + outerPx.w * (safe.left ?? 0)),
    y: Math.round(outerPx.y + outerPx.h * (safe.top ?? 0)),
    w: Math.max(1, Math.round(outerPx.w * (1 - (safe.left ?? 0) - (safe.right ?? 0)))),
    h: Math.max(1, Math.round(outerPx.h * (1 - (safe.top ?? 0) - (safe.bottom ?? 0))))
  };

  return { outerPx, innerPx };
}
