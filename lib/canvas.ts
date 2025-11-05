// lib/canvas.ts
import type { BlackboardInfo, ProcessedImage, Template, BlackboardDesignSettings } from '@/types';
import { sha256File, sha256Blob } from './hash';
import { blackboardInfoToData, getFieldValue } from './blackboard-utils';
import { renderBlackboardCompat } from './render-blackboard';

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

  // renderBlackboardCompatを使用（Union型安全）
  await renderBlackboardCompat(ctx, blackboardInfo, img.width, img.height, template, 0, 0, img.width, img.height);

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

// ✅ drawTemplateBlackboard と drawBlackboard は削除
// renderBlackboardCompat を使用することでUnion型安全に描画

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
