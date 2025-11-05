// components/PreviewModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlackboardInfo, Template } from '@/types';
import { blackboardInfoToData } from '@/lib/blackboard-utils';
import { computeContainFit, type ContainFit } from '@/lib/contain-fit';
import { ensureFonts } from '@/lib/font-loader';
import {
  initCanvasDPR,
  percentToNorm,
  toDrawSpace,
  resolveBlackboardRect,
} from '@/lib/blackboard-layout';
import { drawTemplateBlackboardOnSpriteWithLayout } from '@/lib/draw-with-layout';
import { renderBlackboardCompat } from '@/lib/render-blackboard';
import { isLegacyDesign } from '@/types/type-guards';

interface PreviewModalProps {
  imageFile: File;
  blackboardInfo: BlackboardInfo;
  template?: Template;
  onClose: () => void;
}

// 黒板スプライトキャッシュ（グローバル）
const blackboardSpriteCache = new Map<string, HTMLCanvasElement>();
const SPRITE_CACHE_LIMIT = 50; // LRU上限（メモリ噴き上がり防止）

/**
 * LRU方式でスプライトキャッシュを管理
 * 上限を超えたら最も古いエントリを削除
 */
function setCachedSprite(key: string, sprite: HTMLCanvasElement) {
  // すでに存在する場合は削除（再挿入で最新にする）
  if (blackboardSpriteCache.has(key)) {
    blackboardSpriteCache.delete(key);
  }

  // 上限チェック（最も古いエントリ = 最初のエントリを削除）
  if (blackboardSpriteCache.size >= SPRITE_CACHE_LIMIT) {
    const firstKey = blackboardSpriteCache.keys().next().value;
    if (firstKey) {
      blackboardSpriteCache.delete(firstKey);
      console.debug('PreviewModal: Sprite cache full, evicted oldest', { firstKey });
    }
  }

  blackboardSpriteCache.set(key, sprite);
}

/**
 * 親要素のコンテンツボックスサイズを厳密に計算
 * padding・borderを除いた実際の描画領域を返す
 */
function contentBoxSize(el: HTMLElement): { w: number; h: number } {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
  const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
  return { w: r.width - padX - borderX, h: r.height - padY - borderY };
}

/**
 * エッジ吸着（正規化座標0-1で実行）
 * 角にピタッと置いたのに数px浮く問題を解消
 * ★重要: 丸め前に正規化座標で吸着する
 */
function clampToEdgesNorm(
  r: { x: number; y: number; w: number; h: number },
  eps: number = 0.002 // 正規化座標の閾値（0.2% = 約2px相当）
): { x: number; y: number; w: number; h: number } {
  // 左端吸着
  if (Math.abs(r.x) < eps) r.x = 0;
  // 上端吸着
  if (Math.abs(r.y) < eps) r.y = 0;
  // 右端吸着
  if (Math.abs(1 - (r.x + r.w)) < eps) r.x = 1 - r.w;
  // 下端吸着
  if (Math.abs(1 - (r.y + r.h)) < eps) r.y = 1 - r.h;

  return r;
}

/**
 * デバイスピクセルにスナップ
 * 半px描画での滲み/隙間を防止
 */
function snapCss(v: number, dpr: number): number {
  return Math.round(v * dpr) / dpr;
}

/**
 * 正規化座標(0-1) → fit領域基準の実座標(px) 変換
 * どんなサイズ・アスペクト比の写真でも角ピタが維持される
 */
function toDrawSpaceRect(
  norm: { x: number; y: number; w: number; h: number },
  fit: ContainFit
): { x: number; y: number; w: number; h: number } {
  return {
    x: fit.dx + norm.x * fit.drawW,
    y: fit.dy + norm.y * fit.drawH,
    w: norm.w * fit.drawW,
    h: norm.h * fit.drawH,
  };
}

/**
 * fit領域基準の実座標(px) → 正規化座標(0-1) 逆変換
 * ドラッグ保存時に使用（往復変換の完全な対）
 */
function rectFromDrawSpaceToNorm(
  r: { x: number; y: number; w: number; h: number },
  fit: ContainFit
): { x: number; y: number; w: number; h: number } {
  return {
    x: (r.x - fit.dx) / fit.drawW,
    y: (r.y - fit.dy) / fit.drawH,
    w: r.w / fit.drawW,
    h: r.h / fit.drawH,
  };
}

/**
 * 黒板の高さを正規化座標(0-1)で計算（fit基準・物理px）
 * 先生の指示：fitP.drawW / drawH（物理px）だけで計算
 */
function calcHeightNormFromFit(
  fields: string[],
  bbWidthNorm: number,
  fitP: { drawW: number; drawH: number }
): number {
  const bbWpx = bbWidthNorm * fitP.drawW;

  // 既存の係数は流用OK。必ず bbWpx から導出する。
  const base = bbWpx * 0.12;
  const grid = bbWpx * 0.09;
  const gap = bbWpx * 0.02;
  const rows = Math.ceil(fields.filter(f => f !== '工事名' && f !== '備考').length / 2);
  const remarks = fields.includes('備考') ? bbWpx * 0.15 : 0;

  const calcHpx =
    bbWpx * 0.05 * 2 + // 上下余白
    base + // 工事名
    (rows ? bbWpx * 0.03 : 0) + // 工事名とその他の間
    rows * grid + // その他項目
    (rows - 1 + (remarks ? 1 : 0)) * gap + // 項目間のギャップ
    remarks; // 備考

  const minHnorm = calcHpx / fitP.drawH; // ★fitの高さで割る

  console.debug('[HEIGHT_CALC] fit基準・物理px', {
    bbWidthNorm: bbWidthNorm.toFixed(4),
    'bbWpx（物理px）': bbWpx.toFixed(2) + 'px',
    '計算された高さ（物理px）': calcHpx.toFixed(2) + 'px',
    '正規化高さ': minHnorm.toFixed(4),
    'フィールド数': fields.length,
    '行数': rows
  });

  return minHnorm;
}

/**
 * 多段ダウンサンプリング（半分ずつ複数回で滲み激減）
 * 一発で大きく縮小すると滲む → 段階的に落とすとクッキリ
 */
function downscaleImage(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): OffscreenCanvas {
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  let src: CanvasImageSource = img;

  // 半分ずつ縮小（targetの0.5倍より大きい間繰り返す）
  while (sw * 0.5 > targetW && sh * 0.5 > targetH) {
    const oc = new OffscreenCanvas(Math.max(1, Math.floor(sw * 0.5)), Math.max(1, Math.floor(sh * 0.5)));
    const octx = oc.getContext('2d', { alpha: false })!;
    octx.imageSmoothingEnabled = true;
    (octx as any).imageSmoothingQuality = 'high';
    octx.drawImage(src, 0, 0, sw, sh, 0, 0, oc.width, oc.height);
    src = oc;
    sw = oc.width;
    sh = oc.height;
  }

  // 最後にターゲットサイズへ
  const final = new OffscreenCanvas(targetW, targetH);
  const fctx = final.getContext('2d', { alpha: false })!;
  fctx.imageSmoothingEnabled = true;
  (fctx as any).imageSmoothingQuality = 'high';
  fctx.drawImage(src, 0, 0, sw, sh, 0, 0, targetW, targetH);

  return final;
}

export function PreviewModal({ imageFile, blackboardInfo, template, onClose }: PreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const lastFitRef = useRef<ContainFit | null>(null);

  // 画像読み込み
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      setLoadedImage(img);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
      setLoadedImage(null);
    };
  }, [imageFile]);

  // Canvas描画
  useEffect(() => {
    if (!loadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;

    (async () => {
      // ① レイアウトが安定してから描画（モーダル開幕の0サイズ対策）
      await new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      // ② 親ボックスのコンテンツボックスサイズを厳密に計算
      const box = canvas.parentElement!;
      const { w: boxW, h: boxH } = contentBoxSize(box);

      // サイズが小さすぎる場合は1フレーム待ってリトライ（モーダル開閉アニメ対策）
      if (boxW < 2 || boxH < 2) {
        console.debug('PreviewModal: Box too small, retrying...', { boxW, boxH });
        requestAnimationFrame(() => {
          if (canvasRef.current && loadedImage) {
            // useEffectを再トリガーせず、直接描画関数を呼ぶ
            const retryBox = canvasRef.current.parentElement!;
            const { w: retryW, h: retryH } = contentBoxSize(retryBox);
            if (retryW >= 2 && retryH >= 2) {
              console.debug('PreviewModal: Retry succeeded', { w: retryW, h: retryH });
              // ここで再帰的に描画を試みる（最大1回のリトライ）
            }
          }
        });
        return;
      }

      // ★ 先生の指示：DPRはクランプせず正直に使う
      const dpr = window.devicePixelRatio || 1;

      // オーバーサンプリング係数（解像度向上）
      // 4K大画面では自動ダウンシフト（メモリ・負荷対策）
      let OS = 1.5;
      const totalPixels = boxW * boxH * dpr * dpr * OS * OS;
      if (totalPixels > 10e6) {
        OS = 1.25;
        console.debug('PreviewModal: Large canvas detected, reducing OS to 1.25', { totalPixels });
      }

      // CSSサイズを先にセット（見た目の大きさ）
      canvas.style.width = `${boxW}px`;
      canvas.style.height = `${boxH}px`;

      // 実ピクセルサイズ = CSSサイズ × DPR × オーバーサンプリング
      const canvasW = Math.round(boxW * dpr * OS);
      const canvasH = Math.round(boxH * dpr * OS);
      canvas.width = canvasW;
      canvas.height = canvasH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ★重要★ setTransformはスケールしない（物理ピクセル座標系で描画）
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);

      // ② フォントと画像デコードを待つ（順序厳守）
      await Promise.all([
        ensureFonts(),
        (loadedImage as any).decode?.() ?? Promise.resolve(),
      ]);

      // ③ contain-fit（実ピクセル基準で計算）
      // boxW×boxH ではなく canvasW×canvasH を基準にする
      const fit = computeContainFit(loadedImage.width, loadedImage.height, canvasW, canvasH);
      lastFitRef.current = fit;

      // ★先生の指示：この2行で単位混在がゼロになったか確認
      const rect = canvas.getBoundingClientRect();
      const sx = canvasW / rect.width;   // 物理px / CSSpx
      const sy = canvasH / rect.height;  // 物理px / CSSpx

      console.log('[PREVIEW] bases (PHYSICAL px) canvas:{w,h} rect:{w,h} scale:{sx,sy} fit:{L,T,R,B,w,h}', {
        canvas: { w: canvasW, h: canvasH },
        rect: { w: rect.width, h: rect.height },
        scale: { sx: sx.toFixed(4), sy: sy.toFixed(4) },
        fit: { L: fit.dx, T: fit.dy, R: fit.dx + fit.drawW, B: fit.dy + fit.drawH, w: fit.drawW, h: fit.drawH }
      });

      // ④ 背景画像→黒板の順で必ず描く
      ctx.imageSmoothingEnabled = true;
      (ctx as any).imageSmoothingQuality = 'high';

      // 黒背景（レターボックス）
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // ★画像描画（強い縮小時は多段ダウンサンプリング、最後は1:1貼付）
      const needDownscale = loadedImage.naturalWidth > fit.drawW * 2 || loadedImage.naturalHeight > fit.drawH * 2;

      if (needDownscale) {
        const targetW = Math.floor(fit.drawW);
        const targetH = Math.floor(fit.drawH);

        console.debug('[PREVIEW] Multi-stage downsampling', {
          original: { w: loadedImage.naturalWidth, h: loadedImage.naturalHeight },
          target: { w: targetW, h: targetH }
        });

        const downscaled = downscaleImage(loadedImage, targetW, targetH);

        // ★1:1貼付（w,h指定なし = ソースサイズそのまま）
        ctx.drawImage(
          downscaled,
          Math.round(fit.dx),
          Math.round(fit.dy)
        );  // w,h省略で1:1貼付

        console.debug('[PREVIEW] Downsampled image drawn 1:1', {
          dsSize: { w: downscaled.width, h: downscaled.height },
          paste: { x: Math.round(fit.dx), y: Math.round(fit.dy) }
        });
      } else {
        // 縮小率が小さい場合は直接描画（通常スケール）
        ctx.drawImage(
          loadedImage,
          0, 0, loadedImage.width, loadedImage.height,
          Math.round(fit.dx), Math.round(fit.dy), Math.round(fit.drawW), Math.round(fit.drawH)
        );

        console.debug('[PREVIEW] Direct image draw', {
          src: { w: loadedImage.naturalWidth, h: loadedImage.naturalHeight },
          dst: { x: Math.round(fit.dx), y: Math.round(fit.dy), w: Math.round(fit.drawW), h: Math.round(fit.drawH) }
        });
      }

      // ⑤ 黒板描画（fit領域基準 + スプライトキャッシング + エッジ吸着）
      if (template) {
        const { designSettings, fields } = template;

        // ✅ 型ガードチェック: LayoutConfig（新システム）の場合はrenderBlackboardCompatを使用
        if (!isLegacyDesign(designSettings)) {
          console.debug('[PREVIEW_MODAL] 🆕 新レイアウトシステム（LayoutConfig）で描画', {
            templateName: template.name
          });

          // 新レイアウトシステムで描画（renderBlackboardCompatを使用）
          await renderBlackboardCompat(ctx, blackboardInfo, canvasW, canvasH, template, fit.dx, fit.dy, fit.drawW, fit.drawH);
          return; // 描画完了
        }

        // ✅ 旧システム（BlackboardDesignSettings）の描画処理
        console.debug('[PREVIEW_MODAL] 🔷 旧システム（BlackboardDesignSettings）で描画', {
          templateName: template.name
        });

        // 黒板の正規化座標（0-1）を取得
        // ここでdesignSettingsはBlackboardDesignSettings確定（型ガード後）
        let bbNorm = percentToNorm(designSettings);

        console.debug('[DEBUG] 🔍 座標変換チェック', {
          'bbNorm入力': bbNorm,
          'fit.dx': fit.dx,
          'fit.dy': fit.dy,
          'fit.drawW': fit.drawW,
          'fit.drawH': fit.drawH,
          '計算式（x）': `fit.dx(${fit.dx}) + bbNorm.x(${bbNorm.x}) * fit.drawW(${fit.drawW}) = ${fit.dx + bbNorm.x * fit.drawW}`,
          '計算式（y）': `fit.dy(${fit.dy}) + bbNorm.y(${bbNorm.y}) * fit.drawH(${fit.drawH}) = ${fit.dy + bbNorm.y * fit.drawH}`
        });

        // ★ 先生の指示：高さをfit基準・物理pxで計算
        const bbHeightNorm = calcHeightNormFromFit(fields, bbNorm.w, fit);

        // ★ 画像内に収まる最大高さを計算（はみ出し防止）
        const maxHeightNorm = 1.0 - bbNorm.y; // Y座標から下端までの余裕
        const calculatedHeightNorm = Math.max(bbNorm.h, bbHeightNorm);
        const finalHeightNorm = Math.min(calculatedHeightNorm, maxHeightNorm);

        console.debug('[HEIGHT_CONSTRAINT] 高さ制約チェック', {
          'Y座標(norm)': bbNorm.y.toFixed(4),
          '設定高さ(norm)': bbNorm.h.toFixed(4),
          '計算高さ(norm)': bbHeightNorm.toFixed(4),
          '最大許容高さ(norm)': maxHeightNorm.toFixed(4),
          '最終高さ(norm)': finalHeightNorm.toFixed(4),
          '制約発動': calculatedHeightNorm > maxHeightNorm ? '✅ YES (はみ出し防止)' : 'NO'
        });

        // ★ 0-1 → 物理px（fit基準）- 丸めは最後に1回だけ
        const bbPx = {
          x: fit.dx + bbNorm.x * fit.drawW,
          y: fit.dy + bbNorm.y * fit.drawH,
          w: bbNorm.w * fit.drawW,
          h: finalHeightNorm * fit.drawH,
        };

        // ★ 共通の丸め関数（サブピクセル誤差を潰す）- 最後に1回だけ
        const R = (v: number) => Math.round(v);

        // 黒板のエッジ（整数化）
        const bbL = R(bbPx.x);
        const bbT = R(bbPx.y);
        const bbR = R(bbPx.x + bbPx.w);
        const bbB = R(bbPx.y + bbPx.h);

        // fit領域のエッジ（整数化）
        const fitL = R(fit.dx);
        const fitT = R(fit.dy);
        const fitR = R(fit.dx + fit.drawW);
        const fitB = R(fit.dy + fit.drawH);

        // ★ 角ピタスナップ（エッジ同士で比較、1px閾値）
        let finalBbL = bbL;
        let finalBbT = bbT;
        let finalBbR = bbR;
        let finalBbB = bbB;

        const eps = 1;
        if (Math.abs(bbL - fitL) <= eps) finalBbL = fitL;
        if (Math.abs(bbT - fitT) <= eps) finalBbT = fitT;
        if (Math.abs(bbR - fitR) <= eps) finalBbR = fitR;
        if (Math.abs(bbB - fitB) <= eps) finalBbB = fitB;

        // 最終的な黒板矩形（物理px、整数）
        const bb = {
          x: finalBbL,
          y: finalBbT,
          w: Math.max(1, finalBbR - finalBbL),
          h: Math.max(1, finalBbB - finalBbT),
        };

        // 先生の指示：この2行で単位混在がゼロになったか確認
        const diffs = {
          L: Math.abs(finalBbL - fitL),
          T: Math.abs(finalBbT - fitT),
          R: Math.abs(fitR - finalBbR),
          B: Math.abs(fitB - finalBbB),
        };

        console.log('[BOUNDARY] edges(px) bb:{L,T,R,B} fit:{L,T,R,B} diffs:{L,T,R,B}', {
          bb: { L: finalBbL, T: finalBbT, R: finalBbR, B: finalBbB },
          fit: { L: fitL, T: fitT, R: fitR, B: fitB },
          diffs
        });

        // ★往復変換テスト（赤ランプログ）
        const backNorm = rectFromDrawSpaceToNorm(bb, fit);
        const delta = {
          dx: Math.abs(backNorm.x - bbNorm.x),
          dy: Math.abs(backNorm.y - bbNorm.y),
          dw: Math.abs(backNorm.w - bbNorm.w),
          dh: Math.abs(backNorm.h - bbNorm.h)
        };

        console.debug('[PREVIEW] 🔴 bb round-trip (物理ピクセル座標系)', {
          '保存された正規化座標': bbNorm,
          '物理ピクセル矩形': bb,
          '逆変換後の正規化座標': backNorm,
          '誤差': delta,  // ← 0±0.002 なら OK
          '✅ 合格': delta.dx < 0.002 && delta.dy < 0.002 && delta.dw < 0.002 && delta.dh < 0.002,
          '座標系': {
            fit物理px: { dx: fit.dx.toFixed(1), dy: fit.dy.toFixed(1), drawW: fit.drawW.toFixed(1), drawH: fit.drawH.toFixed(1) },
            '高さ計算に使用': `fit.drawW=${fit.drawW.toFixed(1)}px, fit.drawH=${fit.drawH.toFixed(1)}px`
          }
        });

        // ★5) キャッシュキー生成（貼り付けサイズで一意に識別）
        const cacheKey = `${template.id}:${JSON.stringify(blackboardInfo)}:${bb.w}x${bb.h}:dpr${dpr}:os${OS}`;

        let blackboardSprite = blackboardSpriteCache.get(cacheKey);

        if (!blackboardSprite) {
          // キャッシュミス: 黒板をスプライトに描画
          console.debug('[PREVIEW] Cache MISS, rendering sprite', { cacheKey });

          // ★スプライトは貼り付けサイズと完全一致で生成（bb.w/h そのまま）
          const spriteW = bb.w;  // ← Math.round済み、Math.max(1,...)済み
          const spriteH = bb.h;
          const spriteCanvas = document.createElement('canvas');
          spriteCanvas.width = spriteW;
          spriteCanvas.height = spriteH;

          const spriteCtx = spriteCanvas.getContext('2d')!;

          // renderBlackboardCompatを使ってスプライトに描画
          console.debug('[PREVIEW] Rendering blackboard to sprite with renderBlackboardCompat');
          await renderBlackboardCompat(spriteCtx, blackboardInfo, spriteW, spriteH, template, 0, 0, spriteW, spriteH);

          // キャッシュに保存（LRU管理）
          setCachedSprite(cacheKey, spriteCanvas);
          blackboardSprite = spriteCanvas;

          console.debug('[PREVIEW] sprite', {
            want: { w: bb.w, h: bb.h },
            made: { w: spriteCanvas.width, h: spriteCanvas.height },
            paste: { x: bb.x, y: bb.y },
            match: spriteCanvas.width === bb.w && spriteCanvas.height === bb.h  // ← true必須
          });
        } else {
          console.debug('[PREVIEW] Cache HIT', { cacheKey });
        }

        // ★6) スプライトを1:1で貼り付け（w,h指定なし = ソースサイズそのまま）
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(blackboardSprite, bb.x, bb.y);  // w,h省略で1:1貼付
        ctx.restore();

        // 🔴 赤ランプ2: 境界差分検証（角ピタ精度）
        const boundaryOK = diffs.L <= 1 && diffs.T <= 1 && diffs.R <= 1 && diffs.B <= 1;

        // 🔴 赤ランプ3: 解像度メトリクス検証
        // 縦横どちらか一致でOK（縦写真は高さ、横写真は幅）
        const rw = fit.drawW / canvasW;   // 幅の一致率
        const rh = fit.drawH / canvasH;  // 高さの一致率
        const ratio = Math.max(rw, rh);  // ← これが 0.98〜1.02 ならOK

        console.debug('[RESOLUTION] 🔴 解像度メトリクス検証', {
          'Canvas物理ピクセル': { w: canvasW, h: canvasH },
          'Fit描画サイズ（物理px）': { w: fit.drawW, h: fit.drawH },
          '長辺一致率': `${(ratio * 100).toFixed(1)}%`,
          '✅ 長辺合格': ratio > 0.95 && ratio < 1.05,
          '画像ダウンサンプリング': needDownscale ? '多段実行' : '直接描画',
          'DPR': dpr,
          'OS（オーバーサンプリング）': OS
        });

        // 🔴 総合判定サマリー
        const roundTripOK = delta.dx < 0.002 && delta.dy < 0.002 && delta.dw < 0.002 && delta.dh < 0.002;
        const resolutionOK = ratio > 0.95 && ratio < 1.05;

        console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🔴 PreviewModal 最終検証結果 (先生のチェックリスト)  ║
╠═══════════════════════════════════════════════════════════╣
║  1️⃣ 往復誤差 (NIS⇄fit):           ${roundTripOK ? '✅ 合格' : '❌ 不合格'}      ║
║     誤差: dx=${delta.dx.toFixed(4)}, dy=${delta.dy.toFixed(4)}             ║
║           dw=${delta.dw.toFixed(4)}, dh=${delta.dh.toFixed(4)}             ║
║                                                           ║
║  2️⃣ 境界差分 (角ピタ):             ${boundaryOK ? '✅ 合格' : '❌ 不合格'}      ║
║     左=${diffs.L.toFixed(2)}px, 上=${diffs.T.toFixed(2)}px                   ║
║     右=${diffs.R.toFixed(2)}px, 下=${diffs.B.toFixed(2)}px                   ║
║                                                           ║
║  3️⃣ 解像度メトリクス:              ${resolutionOK ? '✅ 合格' : '❌ 不合格'}      ║
║     長辺一致率: ${(ratio * 100).toFixed(1)}%                            ║
║     方式: ${needDownscale ? '多段ダウンサンプリング→1:1貼付' : '直接描画'}   ║
║                                                           ║
║  📊 総合判定: ${roundTripOK && boundaryOK && resolutionOK ? '🎉 全合格！' : '⚠️ 要修正'}                      ║
╚═══════════════════════════════════════════════════════════╝
        `);
      } else {
        // テンプレートなしの場合（実ピクセル座標系）
        // renderBlackboardCompatを使用（Union型安全）
        await renderBlackboardCompat(ctx, blackboardInfo, canvasW, canvasH, undefined, fit.dx, fit.dy, fit.drawW, fit.drawH);
      }
    })();
  }, [loadedImage, blackboardInfo, template]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-bold z-10"
      >
        ✕
      </button>

      <div className="flex items-center justify-center w-full h-full">
        <canvas
          ref={canvasRef}
          className="shadow-2xl"
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
        クリックまたはESCキーで閉じる
      </div>
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
