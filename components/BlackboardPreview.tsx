// components/BlackboardPreview.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { BlackboardInfo, Template } from '@/types';
import { blackboardInfoToData } from '@/lib/blackboard-utils';
import {
  initCanvasDPR,
  percentToNorm,
  normToPercent,
  pointCssToNorm,
  resolveBlackboardRect,
  toDrawSpace,
  clamp01,
  type NormRect,
} from '@/lib/blackboard-layout';
import { computeContainFit, type ContainFit } from '@/lib/contain-fit';
import { ensureFonts } from '@/lib/font-loader';
import { drawTemplateBlackboardWithLayout } from '@/lib/draw-with-layout';
import { renderBlackboardCompat } from '@/lib/render-blackboard';
import { isLegacyDesign } from '@/types/type-guards';

interface BlackboardPreviewProps {
  imageFile: File | null;
  blackboardInfo: BlackboardInfo;
  template?: Template;
  onPreviewClick?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onAddPhoto?: () => void;
  onTemplateChange?: () => void;
}

export function BlackboardPreview({ imageFile, blackboardInfo, template, onPreviewClick, onPositionChange, onAddPhoto, onTemplateChange }: BlackboardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);

  // contain-fit計算結果をキャッシュ（描画とドラッグで同じ値を使う）
  const lastFitRef = useRef<ContainFit | null>(null);

  // 描画関数（useCallbackでメモ化、リサイズ時にも呼ばれる）
  const drawCanvas = useCallback(async () => {
    if (!loadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;

    console.debug('BlackboardPreview: Drawing canvas', {
      hasTemplate: !!template,
      templateName: template?.name
    });

    // フォント読み込み完了を待つ（初回のみ）
    await ensureFonts();

    // DPR対応でCanvas初期化（CSS座標系統一）
    const ctx = initCanvasDPR(canvas);
    if (!ctx) {
      console.log('BlackboardPreview: Failed to initialize canvas');
      return;
    }

    // Canvas CSS座標を取得（initCanvasDPRの後）
    const rect = canvas.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;

    // 画像をcontain-fitで描画（統一関数を使用）
    const imgW = loadedImage.width;
    const imgH = loadedImage.height;
    const fit = computeContainFit(imgW, imgH, canvasW, canvasH);

    // contain-fit結果をキャッシュ（ドラッグ処理で同じ値を使う）
    lastFitRef.current = fit;

    // ★ DPRを最低1に固定（ブラウザズーム対策）
    const dprRaw = window.devicePixelRatio || 1;
    const dpr = Math.max(1, dprRaw);

    // 解像度調査用ログ
    console.debug('[BLACKBOARD_PREVIEW] 🔴 座標系検証 (CSS座標系)', {
      '画像': { w: imgW, h: imgH },
      'CSS座標': { w: canvasW, h: canvasH },
      'DPR（生値）': dprRaw,
      'DPR（clamp後）': dpr,
      'Canvas物理ピクセル': { w: canvas.width, h: canvas.height },
      'contain-fit結果（CSS座標）': { ...fit },
      '高さ計算に使用': `fit.drawW=${fit.drawW.toFixed(1)}px, fit.drawH=${fit.drawH.toFixed(1)}px`,
      'スムージング': {
        enabled: ctx.imageSmoothingEnabled,
        quality: (ctx as any).imageSmoothingQuality
      }
    });

    // 画像品質設定
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = 'high';

    // 背景を黒で塗りつぶし（レターボックス対応）
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 画像を中央配置で描画
    ctx.drawImage(loadedImage, fit.dx, fit.dy, fit.drawW, fit.drawH);

    console.debug('BlackboardPreview: Image drawn with contain-fit', {
      imgW,
      imgH,
      canvasW,
      canvasH,
      fit,
      scaleCheck: Math.abs(fit.scale * imgW - fit.drawW) < 0.01 // 整合性チェック（浮動小数点誤差考慮）
    });

    // 黒板を描画（画像の相対位置dx/dyを考慮）
    if (template) {
      // ★ GPT先生のB案：段階的統合 - layout_idがあれば新システム、なければ旧システム
      if (template.layout_id) {
        console.debug('BlackboardPreview: Drawing with NEW layout system', {
          templateName: template.name,
          layoutId: template.layout_id
        });
        drawTemplateBlackboardWithLayout(ctx, blackboardInfo, canvasW, canvasH, template, fit);
      } else {
        console.debug('BlackboardPreview: Drawing with OLD template system', template.name);
        await renderBlackboardCompat(ctx, blackboardInfo, canvasW, canvasH, template, fit.dx, fit.dy, fit.drawW, fit.drawH);
      }
    } else {
      console.debug('BlackboardPreview: Drawing without template (legacy)');
      // テンプレートなしの場合もfacadeを使用（Union型安全）
      await renderBlackboardCompat(ctx, blackboardInfo, canvasW, canvasH, undefined, fit.dx, fit.dy, fit.drawW, fit.drawH);
    }

    console.debug('BlackboardPreview: Drawing complete');
  }, [
    loadedImage,
    blackboardInfo,
    template
  ]);

  // 画像読み込み（imageFileが変わった時のみ）
  useEffect(() => {
    if (!imageFile) {
      setLoadedImage(null);
      return;
    }

    console.log('BlackboardPreview: Loading image');
    const img = new Image();

    img.onload = () => {
      console.log('BlackboardPreview: Image loaded', { width: img.width, height: img.height });
      setLoadedImage(img);
    };

    img.onerror = (e) => {
      console.error('BlackboardPreview: Image failed to load', e);
      setLoadedImage(null);
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Canvas描画（blackboardInfoまたはtemplateが変わった時）
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ResizeObserver（ウィンドウリサイズ/ブラウザズーム/DPR変化に追従）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parentEl = canvas.parentElement;
    if (!parentEl) return;

    const ro = new ResizeObserver(() => {
      console.debug('BlackboardPreview: Resize detected, redrawing...');
      // lastFitを無効化して再計算
      lastFitRef.current = null;
      // 再描画
      drawCanvas();
    });

    ro.observe(parentEl);

    return () => {
      ro.disconnect();
    };
  }, [drawCanvas]);

  // Cleanup時にrAFをキャンセル
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  // ✅ 全Hooksの後に早期returnを配置（Reactのルール）
  if (!imageFile) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        写真を選択するとプレビューが表示されます
      </div>
    );
  }

  // Pointer Events + rAF対応ドラッグハンドラー
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!template || !onPositionChange || !canvasRef.current || !lastFitRef.current) return;

    // ✅ 新レイアウトシステムまたはUnion型保護: ドラッグは旧システムのみ対応
    if (template.layout_id || !isLegacyDesign(template.designSettings)) {
      console.warn('⚠️ ドラッグは旧システムのみ対応');
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Pointer captureで確実に追従
    canvas.setPointerCapture(e.pointerId);

    // キャッシュされたcontain-fit結果を使用（描画時と完全に同じ値）
    const fit = lastFitRef.current;

    // マウス座標（Canvas全体を基準）
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 画像領域内の相対座標に変換
    const relX = mouseX - fit.dx;
    const relY = mouseY - fit.dy;

    // 正規化座標（画像領域を0-1に）
    const normX = relX / fit.drawW;
    const normY = relY / fit.drawH;

    // 現在の黒板矩形（正規化座標に変換）
    // ここでdesignSettingsはBlackboardDesignSettings確定（型ガード後）
    const bbNorm = percentToNorm(template.designSettings);

    // 高さを再計算して確定（画像の描画領域を基準に）
    const finalRect = resolveBlackboardRect(
      bbNorm,
      template.fields,
      fit.drawW,
      fit.drawH
    );

    // 黒板内クリック判定（正規化座標で比較）
    if (
      normX >= finalRect.x &&
      normX <= finalRect.x + finalRect.w &&
      normY >= finalRect.y &&
      normY <= finalRect.y + finalRect.h
    ) {
      const offsetX = normX - finalRect.x;
      const offsetY = normY - finalRect.y;
      setIsDragging(true);
      setDragStart({ x: offsetX, y: offsetY });

      console.debug('[DRAG] 🔴 ドラッグ開始 (CSS座標系)', {
        'マウス位置（CSS）': { x: mouseX, y: mouseY },
        '画像オフセット（CSS）': { dx: fit.dx, dy: fit.dy },
        '正規化座標（0-1）': { x: normX.toFixed(4), y: normY.toFixed(4) },
        '黒板矩形（正規化）': finalRect,
        'ドラッグオフセット': { x: offsetX.toFixed(4), y: offsetY.toFixed(4) }
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !template || !onPositionChange || !canvasRef.current || !lastFitRef.current) return;

    // ✅ 新レイアウトシステムまたはUnion型保護: ドラッグは旧システムのみ対応
    if (template.layout_id || !isLegacyDesign(template.designSettings)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const fit = lastFitRef.current;

    // ★マウス座標（CSS座標）
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // ★現在の黒板矩形をfit基準のpx座標で取得（描画時と同じ計算）
    // ここでdesignSettingsはBlackboardDesignSettings確定（型ガード後）
    const bbNorm = percentToNorm(template.designSettings);
    const finalRect = resolveBlackboardRect(bbNorm, template.fields, fit.drawW, fit.drawH);

    // ★fit領域基準のpx座標に変換
    const bbPx = {
      x: fit.dx + finalRect.x * fit.drawW,
      y: fit.dy + finalRect.y * fit.drawH,
      w: finalRect.w * fit.drawW,
      h: finalRect.h * fit.drawH
    };

    // ★マウス位置から黒板の新しい左上座標を計算（px）
    const newPxX = mouseX - dragStart.x * bbPx.w;  // dragStart.xは黒板内の相対位置(0-1)
    const newPxY = mouseY - dragStart.y * bbPx.h;

    // ★fit領域内に収める（黒板が画像からはみ出さないように）
    const clampedPxX = Math.max(fit.dx, Math.min(fit.dx + fit.drawW - bbPx.w, newPxX));
    const clampedPxY = Math.max(fit.dy, Math.min(fit.dy + fit.drawH - bbPx.h, newPxY));

    // ★fit基準のpx座標 → 正規化座標(0-1)に逆変換
    const normX = (clampedPxX - fit.dx) / fit.drawW;
    const normY = (clampedPxY - fit.dy) / fit.drawH;

    // ★エッジ吸着（正規化座標で）
    const eps = 0.002;
    let finalNormX = normX;
    let finalNormY = normY;

    if (Math.abs(normX) < eps) finalNormX = 0;
    if (Math.abs(normY) < eps) finalNormY = 0;
    if (Math.abs(1 - (normX + finalRect.w)) < eps) finalNormX = 1 - finalRect.w;
    if (Math.abs(1 - (normY + finalRect.h)) < eps) finalNormY = 1 - finalRect.h;

    // rAFでバッファリング（スムーズなドラッグ）
    pendingPosRef.current = { x: finalNormX, y: finalNormY };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingPosRef.current) {
          // ★%に戻して保存（fit基準0-1 → %）
          const percentPos = {
            x: pendingPosRef.current.x * 100,
            y: pendingPosRef.current.y * 100
          };
          onPositionChange(percentPos);
          console.debug('[DRAG] 🔴 位置更新 (fit基準・CSS座標系)', {
            '正規化座標（0-1）': pendingPosRef.current,
            'パーセント座標（保存用）': percentPos,
            '座標系': 'CSS (initCanvasDPR使用)'
          });
        }
        rafRef.current = 0;
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging && canvasRef.current) {
      canvasRef.current.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      // 最後の更新を即座に適用
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;

        if (pendingPosRef.current && onPositionChange) {
          const percentPos = {
            x: pendingPosRef.current.x * 100,
            y: pendingPosRef.current.y * 100
          };
          onPositionChange(percentPos);
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {template && onTemplateChange && (
            <button
              onClick={onTemplateChange}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">テンプレート:</span>
                <span className="text-sm font-semibold text-blue-700">{template.name}</span>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAddPhoto && (
            <button
              onClick={onAddPhoto}
              className="flex items-center gap-1.5 px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              写真を追加
            </button>
          )}
          {onPreviewClick && (
            <button
              onClick={onPreviewClick}
              className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-600 rounded transition-colors"
            >
              全画面表示
            </button>
          )}
        </div>
      </div>
      <div className="relative">
        <div className="bg-gray-100 rounded-lg p-4 transition-colors">
          <canvas
            ref={canvasRef}
            className={`w-full h-auto rounded shadow-lg ${isDragging ? 'cursor-grabbing' : onPositionChange ? 'cursor-grab' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
      {onPositionChange && (
        <p className="text-xs text-gray-500 text-center">
          黒板をドラッグして位置を調整できます
        </p>
      )}
    </div>
  );
}

/**
 * Helper: hex color to rgba
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const metrics = ctx.measureText(text);
  if (metrics.width <= maxWidth) return text;

  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}
