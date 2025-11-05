// lib/layout-adapter.ts
import type { Template, BlackboardDesignSettings } from '@/types';
import type { LayoutConfig } from '@/types/layouts';
import { isLayoutConfig, isLegacyDesign } from '@/types/type-guards';

type Coerced = { cfg: LayoutConfig; source: 'layout' | 'legacy' };
const pct = (v: number) => Math.max(0, Math.min(1, v / 100));

export function resolveLayoutConfigFromTemplate(t: Template): Coerced {
  const ds = t.designSettings as BlackboardDesignSettings | LayoutConfig;

  if (isLayoutConfig(ds)) {
    const safe = {
      top: ds.safeArea?.top ?? 0.05,
      bottom: Math.max(0.10, ds.safeArea?.bottom ?? 0.10),
      left: ds.safeArea?.left ?? 0.02,
      right: ds.safeArea?.right ?? 0.02,
    };
    return {
      cfg: {
        board: { ...ds.board },
        grid: {
          columns: ds.grid?.columns ?? 2,
          gap: ds.grid?.gap ?? 0.02,
          titlePlacement: ds.grid?.titlePlacement ?? 'top-full-width',
          remarksScale: ds.grid?.remarksScale ?? 1.0,
        },
        typography: {
          base: ds.typography?.base ?? 0.055,
          scaleTitle: ds.typography?.scaleTitle ?? 1.10,
        },
        safeArea: safe,
        style: {
          variant: ds.style?.variant ?? 'green',
          opacity: ds.style?.opacity ?? 0.92,
          bgColor: ds.style?.bgColor,
          textColor: ds.style?.textColor,
        },
      },
      source: 'layout',
    };
  }

  if (isLegacyDesign(ds)) {
    const boardX = pct(ds.position.x);
    const boardY = pct(ds.position.y);
    const boardW = pct(ds.width);
    const boardH = pct(ds.height);
    return {
      cfg: {
        board: { x: boardX, y: boardY, w: boardW, h: boardH, anchor: 'left-top' },
        grid: { columns: 2, gap: 0.02, titlePlacement: 'top-full-width', remarksScale: 1.0 },
        typography: { base: ds.fontSize === 'large' ? 0.065 : 0.055, scaleTitle: 1.10 },
        safeArea: { top: 0.05, bottom: 0.10, left: 0.02, right: 0.02 },
        style: {
          variant: (ds.bgColor === '#000000' ? 'black' : 'green'),
          opacity: (ds.opacity ?? 85) / 100,
          bgColor: ds.bgColor,
          textColor: ds.textColor,
        },
      },
      source: 'legacy',
    };
  }

  // フォールバック（万一不明な形の場合）
  return {
    cfg: {
      board: { x: 0.02, y: 0.78, w: 0.35, h: 0.20, anchor: 'left-bottom' },
      grid: { columns: 2, gap: 0.02, titlePlacement: 'top-full-width', remarksScale: 1.0 },
      typography: { base: 0.055, scaleTitle: 1.10 },
      safeArea: { top: 0.05, bottom: 0.10, left: 0.02, right: 0.02 },
      style: { variant: 'green', opacity: 0.92 },
    },
    source: 'legacy',
  };
}
