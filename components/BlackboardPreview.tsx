// components/BlackboardPreview.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { BlackboardInfo } from '@/types';

interface BlackboardPreviewProps {
  imageFile: File | null;
  blackboardInfo: BlackboardInfo;
  onPreviewClick?: () => void;
}

export function BlackboardPreview({ imageFile, blackboardInfo, onPreviewClick }: BlackboardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // キャンバスサイズを設定（プレビュー用に縮小）
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // 画像を描画
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 黒板を描画
      drawBlackboard(ctx, blackboardInfo, canvas.width, canvas.height);
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, blackboardInfo]);

  if (!imageFile) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        写真を選択するとプレビューが表示されます
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">プレビュー</p>
      <div
        className="bg-gray-100 rounded-lg p-4 flex justify-center cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={onPreviewClick}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto rounded shadow-lg"
        />
      </div>
      <p className="text-xs text-gray-500 text-center">
        クリックで拡大表示 | ※ 実際の画像サイズで処理されます
      </p>
    </div>
  );
}

function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  width: number,
  height: number
) {
  const padding = Math.max(8, Math.floor(width * 0.02));
  const blackboardWidth = Math.min(250, width * 0.8);
  const blackboardHeight = 125;

  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(padding, padding, blackboardWidth, blackboardHeight);

  // 白枠
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(padding, padding, blackboardWidth, blackboardHeight);

  // テキスト
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';

  const baseFontSize = Math.floor(blackboardHeight * 0.12);
  const smallFontSize = Math.floor(blackboardHeight * 0.09);

  let y = padding + 10;
  const lineHeight = baseFontSize + 5;

  // 工事名
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(truncateText(ctx, info.projectName, blackboardWidth - 20), padding + 10, y);
  y += lineHeight;

  // 工種・天候
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(`${info.workType} | ${info.weather}`, padding + 10, y);
  y += lineHeight;

  // 作業内容
  if (info.workContent) {
    ctx.font = `${smallFontSize}px sans-serif`;
    ctx.fillText(truncateText(ctx, info.workContent, blackboardWidth - 20), padding + 10, y);
    y += lineHeight * 0.8;
  }

  // 日時
  ctx.font = `${smallFontSize}px sans-serif`;
  const dateStr = info.timestamp.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillText(dateStr, padding + 10, y);

  // 改ざん検知マーク
  ctx.font = `${smallFontSize * 0.6}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.fillText('SHA-256', padding + blackboardWidth - 60, padding + blackboardHeight - 15);
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
