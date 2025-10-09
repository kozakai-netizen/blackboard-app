// components/PreviewModal.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { BlackboardInfo, Template } from '@/types';
import { blackboardInfoToData } from '@/lib/blackboard-utils';

interface PreviewModalProps {
  imageFile: File;
  blackboardInfo: BlackboardInfo;
  template?: Template;
  onClose: () => void;
}

export function PreviewModal({ imageFile, blackboardInfo, template, onClose }: PreviewModalProps) {
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

      if (template) {
        drawTemplateBlackboard(ctx, blackboardInfo, canvas.width, canvas.height, template);
      } else {
        drawBlackboard(ctx, blackboardInfo, canvas.width, canvas.height);
      }
    };
    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile, blackboardInfo, template]);

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

function drawTemplateBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  canvasWidth: number,
  canvasHeight: number,
  template: Template
) {
  const { designSettings, fields } = template;
  const data = blackboardInfoToData(info);

  const bbWidth = (canvasWidth * designSettings.width) / 100;
  const bbHeight = (canvasHeight * designSettings.height) / 100;
  const bbX = (canvasWidth * designSettings.position.x) / 100;
  const bbY = (canvasHeight * designSettings.position.y) / 100;

  const opacity = (designSettings.opacity || 85) / 100;
  ctx.fillStyle = hexToRgba(designSettings.bgColor, opacity);
  ctx.fillRect(bbX, bbY, bbWidth, bbHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(2, bbWidth * 0.008);
  ctx.strokeRect(bbX, bbY, bbWidth, bbHeight);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  const padding = bbWidth * 0.015; // 余白を半分に
  ctx.fillRect(bbX + padding, bbY + padding, bbWidth - padding * 2, bbHeight - padding * 2);

  const baseFontSize = designSettings.fontSize === 'large'
    ? Math.floor(bbHeight * 0.10) // 大きく
    : Math.floor(bbHeight * 0.08); // 大きく
  const labelFontSize = Math.floor(baseFontSize * 0.9); // ラベルも大きく
  const valueFontSize = Math.floor(baseFontSize * 0.85); // 値も大きく

  ctx.fillStyle = designSettings.textColor;
  ctx.textBaseline = 'top';

  let currentY = bbY + bbHeight * 0.05; // 上余白を減らす

  if (fields.includes('工事名')) {
    const projectName = data.工事名 || '○○マンション新築工事';
    const itemHeight = bbHeight * 0.12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.strokeRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    const labelWidth = bbWidth * 0.15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bbX + padding, currentY, labelWidth, itemHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.beginPath();
    ctx.moveTo(bbX + padding + labelWidth, currentY);
    ctx.lineTo(bbX + padding + labelWidth, currentY + itemHeight);
    ctx.stroke();

    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('工事名', bbX + padding + labelWidth / 2, currentY + itemHeight * 0.3);

    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize}px sans-serif`;
    const valueText = truncateText(ctx, projectName, bbWidth - padding * 2 - labelWidth - bbWidth * 0.05);
    ctx.fillText(valueText, bbX + padding + labelWidth + bbWidth * 0.03, currentY + itemHeight * 0.3);

    currentY += itemHeight + bbHeight * 0.03;
  }

  const otherFields = fields.filter(f => f !== '工事名' && f !== '備考');
  const itemWidth = (bbWidth - padding * 2 - bbWidth * 0.02) / 2;
  const itemHeight = bbHeight * 0.09;
  const gap = bbWidth * 0.02;

  otherFields.forEach((fieldId, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);

    const itemX = bbX + padding + col * (itemWidth + gap);
    const itemY = currentY + row * (itemHeight + bbHeight * 0.02);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(itemX, itemY, itemWidth, itemHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.strokeRect(itemX, itemY, itemWidth, itemHeight);

    const labelWidth = itemWidth * 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(itemX, itemY, labelWidth, itemHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.beginPath();
    ctx.moveTo(itemX + labelWidth, itemY);
    ctx.lineTo(itemX + labelWidth, itemY + itemHeight);
    ctx.stroke();

    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fieldId, itemX + labelWidth / 2, itemY + itemHeight * 0.35);

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

  ctx.font = `${baseFontSize * 0.6}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText('SHA-256', bbX + bbWidth - padding * 2, bbY + bbHeight - bbHeight * 0.08);
  ctx.textAlign = 'left';
}

function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  width: number,
  height: number
) {
  const blackboardHeight = height * 0.2;
  const blackboardWidth = width * 0.8;
  const xPosition = width * 0.03;
  const yPosition = height * 0.8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  ctx.fillStyle = 'white';
  ctx.textBaseline = 'top';
  const baseFontSize = Math.floor(blackboardHeight * 0.2);
  const smallFontSize = Math.floor(blackboardHeight * 0.15);

  let y = yPosition + blackboardHeight * 0.1;
  const lineHeight = baseFontSize * 1.2;

  ctx.font = `bold ${baseFontSize}px sans-serif`;
  ctx.fillText(truncateText(ctx, info.projectName, blackboardWidth * 0.9), xPosition + blackboardWidth * 0.05, y);
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
  ctx.fillText('SHA-256', xPosition + blackboardWidth * 0.65, yPosition + blackboardHeight * 0.85);
}

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
