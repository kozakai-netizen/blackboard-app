// components/TemplatePreviewImage.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { Template, BlackboardData } from '@/types';
import { blackboardInfoToData } from '@/lib/blackboard-utils';

interface TemplatePreviewImageProps {
  template: Template;
}

export function TemplatePreviewImage({ template }: TemplatePreviewImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 黒板のサイズを計算（想定画像サイズ 1200x900）
    const imgWidth = 1200;
    const imgHeight = 900;
    const { designSettings, fields } = template;

    const bbWidth = (imgWidth * designSettings.width) / 100;

    // 固定高さを使用（designSettingsから取得）
    const bbHeight = (imgHeight * designSettings.height) / 100;

    // キャンバスを黒板サイズに設定
    canvas.width = bbWidth;
    canvas.height = bbHeight;

    // 黒板のみを描画（位置は0,0から）
    drawBlackboardOnly(ctx, template, bbWidth, bbHeight);
  }, [template]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-auto rounded border border-gray-200"
    />
  );
}

function drawBlackboardOnly(
  ctx: CanvasRenderingContext2D,
  template: Template,
  bbWidth: number,
  bbHeight: number
) {
  const { designSettings, fields } = template;
  const data: Partial<BlackboardData> = {
    工事名: '○○マンション新築工事',
    工種: template.defaultValues.工種 as string || '土工',
    天候: template.defaultValues.天候 as string || '晴れ',
    種別: template.defaultValues.種別 as string || '掘削',
    細別: template.defaultValues.細別 as string || 'バックホウ',
    撮影日: '2025/10/09',
    施工者: template.defaultValues.施工者 as string || '○○工務店',
    撮影場所: template.defaultValues.撮影場所 as string || 'A工区',
    測点位置: template.defaultValues.測点位置 as string || 'No.10',
    立会者: template.defaultValues.立会者 as string || '山田太郎',
    備考: template.defaultValues.備考 as string || ''
  };

  // 黒板を0,0から描画
  const bbX = 0;
  const bbY = 0;

  // 背景色
  const opacity = (designSettings.opacity || 85) / 100;
  ctx.fillStyle = hexToRgba(designSettings.bgColor, opacity);
  ctx.fillRect(bbX, bbY, bbWidth, bbHeight);

  // 白枠
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(1, bbWidth * 0.008);
  ctx.strokeRect(bbX, bbY, bbWidth, bbHeight);

  // 内側のシャドウ
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  const padding = bbWidth * 0.015;
  ctx.fillRect(bbX + padding, bbY + padding, bbWidth - padding * 2, bbHeight - padding * 2);

  // フォントサイズ
  const baseFontSize = designSettings.fontSize === 'large'
    ? Math.floor(bbHeight * 0.10)
    : Math.floor(bbHeight * 0.08);
  const labelFontSize = Math.floor(baseFontSize * 0.9);
  const valueFontSize = Math.floor(baseFontSize * 0.85);

  ctx.fillStyle = designSettings.textColor;
  ctx.textBaseline = 'top';

  let currentY = bbY + bbHeight * 0.05;

  // 工事名を全幅で表示
  if (fields.includes('工事名')) {
    const itemHeight = bbHeight * 0.12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.strokeRect(bbX + padding, currentY, bbWidth - padding * 2, itemHeight);

    const labelWidth = bbWidth * 0.15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bbX + padding, currentY, labelWidth, itemHeight);

    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('工事名', bbX + padding + labelWidth / 2, currentY + itemHeight * 0.3);

    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize}px sans-serif`;
    ctx.fillText(data.工事名 || '', bbX + padding + labelWidth + bbWidth * 0.03, currentY + itemHeight * 0.3);

    currentY += itemHeight + bbHeight * 0.03;
  }

  // その他の項目を2列グリッドで表示
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

    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fieldId, itemX + labelWidth / 2, itemY + itemHeight * 0.35);

    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize * 0.85}px sans-serif`;
    const value = (data[fieldId as keyof typeof data] as string) || '－';
    ctx.fillText(truncateText(ctx, value, itemWidth - labelWidth - itemWidth * 0.1), itemX + labelWidth + itemWidth * 0.05, itemY + itemHeight * 0.35);
  });

  // SHA-256マーク
  ctx.font = `${baseFontSize * 0.6}px monospace`;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.textAlign = 'right';
  ctx.fillText('SHA-256', bbX + bbWidth - padding * 2, bbY + bbHeight - bbHeight * 0.08);
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
