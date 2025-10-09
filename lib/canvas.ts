// lib/canvas.ts
import type { BlackboardInfo, ProcessedImage, Template, BlackboardDesignSettings } from '@/types';
import { sha256File, sha256Blob } from './hash';
import { blackboardInfoToData, getFieldValue } from './blackboard-utils';

export async function processImage(
  file: File,
  blackboardInfo: BlackboardInfo,
  jobId: string,
  template?: Template
): Promise<ProcessedImage> {
  const originalHash = await sha256File(file);
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  if (template) {
    drawTemplateBlackboard(ctx, blackboardInfo, img.width, img.height, template);
  } else {
    // 後方互換性：テンプレートなしの場合は従来の描画
    drawBlackboard(ctx, blackboardInfo, img.width, img.height);
  }

  const processedBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
      'image/jpeg',
      0.85
    );
  });
  const processedHash = await sha256Blob(processedBlob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const seq = Math.random().toString(36).slice(2, 8);
  const filename = `${jobId}_${seq}_${timestamp}.jpg`;

  return {
    originalFile: file,
    originalHash,
    processedBlob,
    processedHash,
    filename,
    width: img.width,
    height: img.height
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * テンプレート対応の黒板描画（BlackboardPreviewBoxと同じレイアウト）
 */
function drawTemplateBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  canvasWidth: number,
  canvasHeight: number,
  template: Template
) {
  const { designSettings, fields } = template;
  const data = blackboardInfoToData(info);

  // 黒板のサイズと位置を計算（パーセンテージから実際のピクセルへ）
  const bbWidth = (canvasWidth * designSettings.width) / 100;
  const bbHeight = (canvasHeight * designSettings.height) / 100;
  const bbX = (canvasWidth * designSettings.position.x) / 100;
  const bbY = (canvasHeight * designSettings.position.y) / 100;

  // 背景色（透明度を適用）
  const opacity = (designSettings.opacity || 85) / 100;
  ctx.fillStyle = hexToRgba(designSettings.bgColor, opacity);
  ctx.fillRect(bbX, bbY, bbWidth, bbHeight);

  // 白枠（線の太さを相対的に）
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(2, bbWidth * 0.008);
  ctx.strokeRect(bbX, bbY, bbWidth, bbHeight);

  // 内側のシャドウ効果（ダークエリア）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  const padding = bbWidth * 0.015; // 余白を半分に
  ctx.fillRect(bbX + padding, bbY + padding, bbWidth - padding * 2, bbHeight - padding * 2);

  // フォントサイズ（大きく）
  const baseFontSize = designSettings.fontSize === 'large'
    ? Math.floor(bbHeight * 0.10) // 大きく
    : Math.floor(bbHeight * 0.08); // 大きく

  const labelFontSize = Math.floor(baseFontSize * 0.9); // ラベルも大きく
  const valueFontSize = Math.floor(baseFontSize * 0.85); // 値も大きく

  ctx.fillStyle = designSettings.textColor;
  ctx.textBaseline = 'top';

  let currentY = bbY + bbHeight * 0.05; // 上余白を減らす

  // 工事名を全幅で表示
  if (fields.includes('工事名')) {
    const projectName = data.工事名 || '○○マンション新築工事';
    const itemHeight = bbHeight * 0.12;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    // 白枠
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.strokeRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    // ラベル背景
    const labelWidth = bbWidth * 0.15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bbX + padding, currentY, labelWidth, itemHeight);

    // ラベル右側の線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.beginPath();
    ctx.moveTo(bbX + padding + labelWidth, currentY);
    ctx.lineTo(bbX + padding + labelWidth, currentY + itemHeight);
    ctx.stroke();

    // ラベルテキスト
    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('工事名', bbX + padding + labelWidth / 2, currentY + itemHeight * 0.3);

    // 値テキスト
    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize}px sans-serif`;
    const valueText = truncateText(ctx, projectName, bbWidth - padding * 2 - labelWidth - bbWidth * 0.05);
    ctx.fillText(valueText, bbX + padding + labelWidth + bbWidth * 0.03, currentY + itemHeight * 0.3);

    currentY += itemHeight + bbHeight * 0.03;
  }

  // その他の項目を2列グリッドで表示（備考を除く）
  const otherFields = fields.filter(f => f !== '工事名' && f !== '備考');
  const itemWidth = (bbWidth - padding * 2 - bbWidth * 0.02) / 2;
  const itemHeight = bbHeight * 0.09;
  const gap = bbWidth * 0.02;

  otherFields.forEach((fieldId, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);

    const itemX = bbX + padding + col * (itemWidth + gap);
    const itemY = currentY + row * (itemHeight + bbHeight * 0.02);

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(itemX, itemY, itemWidth, itemHeight);

    // 白枠
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.strokeRect(itemX, itemY, itemWidth, itemHeight);

    // ラベル背景
    const labelWidth = itemWidth * 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(itemX, itemY, labelWidth, itemHeight);

    // ラベル右側の線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.beginPath();
    ctx.moveTo(itemX + labelWidth, itemY);
    ctx.lineTo(itemX + labelWidth, itemY + itemHeight);
    ctx.stroke();

    // ラベルテキスト
    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fieldId, itemX + labelWidth / 2, itemY + itemHeight * 0.35);

    // 値テキスト
    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize * 0.85}px sans-serif`;
    const value = (data[fieldId as keyof typeof data] as string) ||
                 (fieldId === '撮影日' ? info.timestamp.toLocaleDateString('ja-JP') : '－');
    const valueText = truncateText(ctx, value, itemWidth - labelWidth - itemWidth * 0.1);
    ctx.fillText(valueText, itemX + labelWidth + itemWidth * 0.05, itemY + itemHeight * 0.35);
  });

  // 備考を黒板下部全幅で表示（高さを2倍に）
  if (fields.includes('備考') && data.備考) {
    const remarksY = currentY + Math.ceil(otherFields.length / 2) * (itemHeight + bbHeight * 0.02) + bbHeight * 0.03;
    const remarksHeight = bbHeight * 0.15;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(bbX + padding, remarksY, bbWidth - padding * 2, remarksHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.strokeRect(bbX + padding, remarksY, bbWidth - padding * 2, remarksHeight);

    const labelWidth = bbWidth * 0.1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bbX + padding, remarksY, labelWidth, remarksHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(bbX + padding + labelWidth, remarksY);
    ctx.lineTo(bbX + padding + labelWidth, remarksY + remarksHeight);
    ctx.stroke();

    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('備考', bbX + padding + labelWidth / 2, remarksY + remarksHeight * 0.35);

    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize * 0.85}px sans-serif`;
    const remarksText = truncateText(ctx, data.備考, bbWidth - padding * 2 - labelWidth - bbWidth * 0.05);
    ctx.fillText(remarksText, bbX + padding + labelWidth + bbWidth * 0.03, remarksY + remarksHeight * 0.35);
  }

  // SHA-256マーク
  ctx.font = `${baseFontSize * 0.6}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText('SHA-256', bbX + bbWidth - padding * 2, bbY + bbHeight - bbHeight * 0.08);
  ctx.textAlign = 'left';
}

/**
 * 従来の黒板描画（後方互換性）
 */
function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  width: number,
  height: number
) {
  // 黒板の高さ：画像高さの20%
  const blackboardHeight = height * 0.2;
  // 黒板の幅：画像幅の80%
  const blackboardWidth = width * 0.8;
  // X座標：左寄せ（パディング3%）
  const xPosition = width * 0.03;
  // Y座標：下部に配置（画像高さの80%の位置）
  const yPosition = height * 0.8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(xPosition, yPosition, blackboardWidth, blackboardHeight);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';
  // フォントサイズを黒板サイズに合わせて調整
  const baseFontSize = Math.floor(blackboardHeight * 0.2);
  const smallFontSize = Math.floor(blackboardHeight * 0.15);

  let y = yPosition + blackboardHeight * 0.1;
  const lineHeight = baseFontSize * 1.2;

  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(info.projectName, xPosition + blackboardWidth * 0.05, y);
  y += lineHeight;

  // 工種と天候（オプショナル）
  if (info.workType || info.weather) {
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    const parts = [info.workType, info.weather].filter(Boolean);
    ctx.fillText(parts.join(' | '), xPosition + blackboardWidth * 0.05, y);
    y += lineHeight;
  }

  ctx.font = `${smallFontSize}px sans-serif`;
  const dateStr = info.timestamp.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillText(dateStr, xPosition + blackboardWidth * 0.05, y);

  ctx.font = `${smallFontSize * 0.8}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.fillText(
    'SHA-256 Protected',
    xPosition + blackboardWidth * 0.65,
    yPosition + blackboardHeight * 0.85
  );
}

/**
 * Hex色をRGBAに変換
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * テキストを最大幅に収まるように切り詰め
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const metrics = ctx.measureText(text);
  if (metrics.width <= maxWidth) return text;

  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

export async function processImages(
  files: File[],
  blackboardInfo: BlackboardInfo,
  jobId: string,
  onProgress?: (current: number, total: number) => void,
  template?: Template
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  for (let i = 0; i < files.length; i++) {
    const processed = await processImage(files[i], blackboardInfo, jobId, template);
    results.push(processed);
    onProgress?.(i + 1, files.length);
  }
  return results;
}
