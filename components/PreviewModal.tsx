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

      <div className="max-w-7xl max-h-[90vh] overflow-auto">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
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
  const padding = Math.max(16, Math.floor(width * 0.02));
  const blackboardWidth = Math.min(500, width * 0.8);
  const blackboardHeight = 250;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(padding, padding, blackboardWidth, blackboardHeight);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.strokeRect(padding, padding, blackboardWidth, blackboardHeight);

  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';
  const baseFontSize = Math.floor(blackboardHeight * 0.12);
  const smallFontSize = Math.floor(blackboardHeight * 0.09);

  let y = padding + 20;
  const lineHeight = baseFontSize + 10;

  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(info.projectName, padding + 20, y);
  y += lineHeight;

  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(`${info.workType} | ${info.weather}`, padding + 20, y);
  y += lineHeight;

  if (info.workContent) {
    ctx.font = `${smallFontSize}px sans-serif`;
    ctx.fillText(info.workContent, padding + 20, y);
    y += lineHeight * 0.8;
  }

  ctx.font = `${smallFontSize}px sans-serif`;
  const dateStr = info.timestamp.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillText(dateStr, padding + 20, y);

  ctx.font = `${smallFontSize * 0.7}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.fillText('SHA-256', padding + blackboardWidth - 80, padding + blackboardHeight - 20);
}
