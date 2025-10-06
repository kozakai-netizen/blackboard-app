// lib/canvas.ts
import type { BlackboardInfo, ProcessedImage } from '@/types';
import { sha256File, sha256Blob } from './hash';

export async function processImage(
  file: File,
  blackboardInfo: BlackboardInfo,
  jobId: string
): Promise<ProcessedImage> {
  const originalHash = await sha256File(file);
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  drawBlackboard(ctx, blackboardInfo, img.width, img.height);
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

  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(`${info.workType} | ${info.weather}`, xPosition + blackboardWidth * 0.05, y);
  y += lineHeight;

  if (info.workContent) {
    ctx.font = `${smallFontSize}px sans-serif`;
    ctx.fillText(info.workContent, xPosition + blackboardWidth * 0.05, y);
    y += lineHeight * 0.9;
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

export async function processImages(
  files: File[],
  blackboardInfo: BlackboardInfo,
  jobId: string,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  for (let i = 0; i < files.length; i++) {
    const processed = await processImage(files[i], blackboardInfo, jobId);
    results.push(processed);
    onProgress?.(i + 1, files.length);
  }
  return results;
}
