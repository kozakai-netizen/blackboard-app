// lib/contain-fit.ts
// 画像のcontain-fit計算を統一管理
// この関数だけを通すことでdx/dy/scaleのズレを完全に防ぐ

export type ContainFit = {
  drawW: number;
  drawH: number;
  dx: number;
  dy: number;
  scale: number;
};

/**
 * 画像をボックスにcontain-fitさせる計算
 *
 * @param imgW 画像の実ピクセル幅
 * @param imgH 画像の実ピクセル高さ
 * @param boxW ボックスの幅（CSS座標）
 * @param boxH ボックスの高さ（CSS座標）
 * @returns contain-fit後の描画サイズとオフセット
 */
export function computeContainFit(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
): ContainFit {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const dx = (boxW - drawW) / 2;
  const dy = (boxH - drawH) / 2;

  return { drawW, drawH, dx, dy, scale };
}
