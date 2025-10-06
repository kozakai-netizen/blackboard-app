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
      console.log('Image loaded:', {
        width: img.width,
        height: img.height,
        src: img.src.substring(0, 50)
      });

      // 元画像のサイズを維持（高解像度）
      canvas.width = img.width;
      canvas.height = img.height;

      console.log('Canvas size:', {
        width: canvas.width,
        height: canvas.height
      });

      // 画像を描画
      ctx.drawImage(img, 0, 0);

      console.log('Image drawn to canvas');

      console.log('Before drawBlackboard:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      });

      // 黒板を描画
      drawBlackboard(ctx, blackboardInfo, canvas.width, canvas.height);

      console.log('Blackboard drawn');
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
        className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
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
  // 黒板の高さ：画像高さの20%
  const blackboardHeight = height * 0.2;
  // 黒板の幅：画像幅の80%
  const blackboardWidth = width * 0.8;
  // X座標：左寄せ（パディング3%）
  const xPosition = width * 0.03;
  // Y座標：下部に配置（画像高さの80%の位置）
  const yPosition = height * 0.8;

  console.log('Blackboard dimensions:', {
    width: width,
    height: height,
    blackboardWidth: blackboardWidth,
    blackboardHeight: blackboardHeight,
    xPosition: xPosition,
    yPosition: yPosition
  });

  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  // 白枠（線の太さを相対的に）
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, width * 0.003); // canvasサイズに応じて調整
  ctx.strokeRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  // テキスト
  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';

  // フォントサイズを黒板サイズに合わせて調整
  const baseFontSize = Math.floor(blackboardHeight * 0.2);
  const smallFontSize = Math.floor(blackboardHeight * 0.15);

  let y = yPosition + blackboardHeight * 0.1;
  const lineHeight = baseFontSize * 1.2;

  // 工事名
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(truncateText(ctx, info.projectName, blackboardWidth * 0.9), xPosition + blackboardWidth * 0.05, y);
  y += lineHeight;

  // 工種・天候
  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(`${info.workType} | ${info.weather}`, xPosition + blackboardWidth * 0.05, y);
  y += lineHeight;

  // 作業内容
  if (info.workContent) {
    ctx.font = `${smallFontSize}px sans-serif`;
    ctx.fillText(truncateText(ctx, info.workContent, blackboardWidth * 0.9), xPosition + blackboardWidth * 0.05, y);
    y += lineHeight * 0.9;
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
  ctx.fillText(dateStr, xPosition + blackboardWidth * 0.05, y);

  // 改ざん検知マーク
  ctx.font = `${smallFontSize * 0.8}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.fillText('SHA-256', xPosition + blackboardWidth * 0.65, yPosition + blackboardHeight * 0.85);
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
