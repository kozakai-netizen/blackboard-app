// components/PreviewModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { BlackboardInfo } from '@/types';

interface PreviewModalProps {
  imageFile: File;
  blackboardInfo: BlackboardInfo;
  onClose: () => void;
}

export function PreviewModal({ imageFile, blackboardInfo, onClose }: PreviewModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!imageFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // フル解像度で表示
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      drawBlackboard(ctx, blackboardInfo, canvas.width, canvas.height);
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, blackboardInfo]);

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
