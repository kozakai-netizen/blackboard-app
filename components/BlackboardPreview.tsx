// components/BlackboardPreview.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlackboardInfo, Template } from '@/types';
import { blackboardInfoToData } from '@/lib/blackboard-utils';

interface BlackboardPreviewProps {
  imageFile: File | null;
  blackboardInfo: BlackboardInfo;
  template?: Template;
  onPreviewClick?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
}

export function BlackboardPreview({ imageFile, blackboardInfo, template, onPreviewClick, onPositionChange }: BlackboardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // 画像読み込み（imageFileが変わった時のみ）
  useEffect(() => {
    if (!imageFile) {
      setLoadedImage(null);
      return;
    }

    console.log('BlackboardPreview: Loading image');
    const img = new Image();

    img.onload = () => {
      console.log('BlackboardPreview: Image loaded', { width: img.width, height: img.height });
      setLoadedImage(img);
    };

    img.onerror = (e) => {
      console.error('BlackboardPreview: Image failed to load', e);
      setLoadedImage(null);
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Canvas描画（黒板情報が変わった時）
  useEffect(() => {
    if (!loadedImage || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('BlackboardPreview: Failed to get 2d context');
      return;
    }

    console.log('BlackboardPreview: Drawing canvas', {
      hasTemplate: !!template,
      templateName: template?.name
    });

    // Canvasサイズを設定
    canvas.width = loadedImage.width;
    canvas.height = loadedImage.height;

    // 画像を描画
    ctx.drawImage(loadedImage, 0, 0);

    // 黒板を描画
    if (template) {
      console.log('BlackboardPreview: Drawing with template', template.name);
      drawTemplateBlackboard(ctx, blackboardInfo, canvas.width, canvas.height, template);
    } else {
      console.log('BlackboardPreview: Drawing without template (legacy)');
      drawBlackboard(ctx, blackboardInfo, canvas.width, canvas.height);
    }

    console.log('BlackboardPreview: Drawing complete');
  }, [
    loadedImage,
    blackboardInfo.projectName,
    blackboardInfo.workType,
    blackboardInfo.weather,
    blackboardInfo.workContent,
    blackboardInfo.timestamp?.getTime(),
    blackboardInfo.workCategory,
    blackboardInfo.workDetail,
    blackboardInfo.contractor,
    blackboardInfo.location,
    blackboardInfo.station,
    blackboardInfo.witness,
    blackboardInfo.remarks,
    template?.id,
    template?.designSettings.position.x,
    template?.designSettings.position.y
  ]);

  if (!imageFile) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        写真を選択するとプレビューが表示されます
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!template || !onPositionChange) return;
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // 黒板の範囲内かチェック
    const bbWidth = (canvas.width * template.designSettings.width) / 100;
    const bbHeight = (canvas.height * template.designSettings.height) / 100;
    const bbX = (canvas.width * template.designSettings.position.x) / 100;
    const bbY = (canvas.height * template.designSettings.position.y) / 100;

    if (mouseX >= bbX && mouseX <= bbX + bbWidth && mouseY >= bbY && mouseY <= bbY + bbHeight) {
      setIsDragging(true);
      setDragStart({ x: mouseX - bbX, y: mouseY - bbY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !template || !onPositionChange) return;
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const newX = ((mouseX - dragStart.x) / canvas.width) * 100;
    const newY = ((mouseY - dragStart.y) / canvas.height) * 100;

    onPositionChange({ x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          プレビュー {onPositionChange && <span className="text-xs text-gray-500">(黒板をドラッグで位置調整)</span>}
        </p>
        {onPreviewClick && (
          <button
            onClick={onPreviewClick}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
          >
            全画面表示
          </button>
        )}
      </div>
      <div className="relative">
        <div className="bg-gray-100 rounded-lg p-4 transition-colors">
          <canvas
            ref={canvasRef}
            className={`w-full h-auto rounded shadow-lg ${isDragging ? 'cursor-grabbing' : onPositionChange ? 'cursor-grab' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
      {onPositionChange && (
        <p className="text-xs text-gray-500 text-center">
          黒板をドラッグして位置を調整できます
        </p>
      )}
    </div>
  );
}

/**
 * テンプレート対応の黒板描画
 */
function drawTemplateBlackboard(
  ctx: CanvasRenderingContext2D,
  info: BlackboardInfo,
  canvasWidth: number,
  canvasHeight: number,
  template: Template
) {
  console.log('drawTemplateBlackboard: START', {
    canvasWidth,
    canvasHeight,
    template: template.name,
    fields: template.fields,
    info
  });

  const { designSettings, fields } = template;
  const data = blackboardInfoToData(info);

  console.log('drawTemplateBlackboard: Converted data', {
    data,
    工事名: data.工事名,
    工種: data.工種,
    天候: data.天候
  });

  // 黒板の幅を計算
  const bbWidth = (canvasWidth * designSettings.width) / 100;

  // 必要な高さを動的に計算
  const baseHeight = bbWidth * 0.12; // 工事名の高さ
  const otherFields = fields.filter(f => f !== '工事名' && f !== '備考');
  const rowCount = Math.ceil(otherFields.length / 2); // 2列グリッド
  const itemHeight = bbWidth * 0.09; // 各項目の高さ
  const remarksHeight = fields.includes('備考') && data.備考 ? bbWidth * 0.15 : 0;
  const bbPadding = bbWidth * 0.015;
  const gaps = bbWidth * 0.02 * (rowCount - 1 + (remarksHeight > 0 ? 1 : 0));

  const calculatedHeight =
    bbWidth * 0.05 * 2 + // 上下余白
    baseHeight + // 工事名
    (rowCount > 0 ? bbWidth * 0.03 : 0) + // 工事名とその他の間
    rowCount * itemHeight + // その他項目
    gaps + // 項目間のギャップ
    remarksHeight; // 備考

  // designSettings.heightと計算した高さの大きい方を使用
  const minHeightPercent = (calculatedHeight / canvasHeight) * 100;
  const heightPercent = Math.max(designSettings.height, minHeightPercent);
  const bbHeight = (canvasHeight * heightPercent) / 100;

  const bbX = (canvasWidth * designSettings.position.x) / 100;
  let bbY = (canvasHeight * designSettings.position.y) / 100;

  // 黒板が画像からはみ出す場合は上に移動
  if (bbY + bbHeight > canvasHeight) {
    bbY = Math.max(0, canvasHeight - bbHeight - bbPadding);
    console.warn('⚠️ Blackboard adjusted to fit canvas', {
      originalY: designSettings.position.y,
      adjustedY: (bbY / canvasHeight) * 100
    });
  }

  console.log('drawTemplateBlackboard: Blackboard dimensions', {
    bbWidth,
    bbHeight,
    bbX,
    bbY,
    calculatedHeight,
    minHeightPercent: minHeightPercent.toFixed(2) + '%',
    usedHeightPercent: heightPercent.toFixed(2) + '%',
    canvasWidth,
    canvasHeight
  });

  // 背景色（透明度を適用）
  const opacity = (designSettings.opacity || 85) / 100;
  ctx.fillStyle = hexToRgba(designSettings.bgColor, opacity);
  ctx.fillRect(bbX, bbY, bbWidth, bbHeight);

  // 白枠
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = Math.max(2, bbWidth * 0.008);
  ctx.strokeRect(bbX, bbY, bbWidth, bbHeight);

  // 内側のシャドウ効果
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
  // otherFieldsは既に上で定義済み
  const itemWidth = (bbWidth - padding * 2 - bbWidth * 0.02) / 2;
  const gridItemHeight = bbHeight * 0.09;
  const gap = bbWidth * 0.02;

  otherFields.forEach((fieldId, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);

    const itemX = bbX + padding + col * (itemWidth + gap);
    const itemY = currentY + row * (gridItemHeight + bbHeight * 0.02);

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(itemX, itemY, itemWidth, gridItemHeight);

    // 白枠
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.strokeRect(itemX, itemY, itemWidth, gridItemHeight);

    // ラベル背景
    const labelWidth = itemWidth * 0.25;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(itemX, itemY, labelWidth, gridItemHeight);

    // ラベル右側の線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.002);
    ctx.beginPath();
    ctx.moveTo(itemX + labelWidth, itemY);
    ctx.lineTo(itemX + labelWidth, itemY + gridItemHeight);
    ctx.stroke();

    // ラベルテキスト
    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(fieldId, itemX + labelWidth / 2, itemY + gridItemHeight * 0.35);

    // 値テキスト
    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize * 0.85}px sans-serif`;
    const value = (data[fieldId as keyof typeof data] as string) ||
                 (fieldId === '撮影日' ? info.timestamp.toLocaleDateString('ja-JP') : '－');
    const valueText = truncateText(ctx, value, itemWidth - labelWidth - itemWidth * 0.1);
    ctx.fillText(valueText, itemX + labelWidth + itemWidth * 0.05, itemY + gridItemHeight * 0.35);
  });

  // 備考を黒板下部全幅で表示（高さを2倍に）
  if (fields.includes('備考') && data.備考) {
    const remarksY = currentY + Math.ceil(otherFields.length / 2) * (gridItemHeight + bbHeight * 0.02) + bbHeight * 0.03;
    const remarksDisplayHeight = bbHeight * 0.15;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(bbX + padding, remarksY, bbWidth - padding * 2, remarksDisplayHeight);

    // 白枠
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, bbWidth * 0.003);
    ctx.strokeRect(bbX + padding, remarksY, bbWidth - padding * 2, remarksDisplayHeight);

    // ラベル背景
    const labelWidth = bbWidth * 0.1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(bbX + padding, remarksY, labelWidth, remarksDisplayHeight);

    // ラベル右側の線
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(bbX + padding + labelWidth, remarksY);
    ctx.lineTo(bbX + padding + labelWidth, remarksY + remarksDisplayHeight);
    ctx.stroke();

    // ラベルテキスト
    ctx.fillStyle = designSettings.textColor;
    ctx.font = `bold ${labelFontSize * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('備考', bbX + padding + labelWidth / 2, remarksY + remarksDisplayHeight * 0.35);

    // 値テキスト
    ctx.textAlign = 'left';
    ctx.font = `${valueFontSize * 0.85}px sans-serif`;
    const remarksText = truncateText(ctx, data.備考, bbWidth - padding * 2 - labelWidth - bbWidth * 0.05);
    ctx.fillText(remarksText, bbX + padding + labelWidth + bbWidth * 0.03, remarksY + remarksDisplayHeight * 0.35);
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
  const blackboardHeight = height * 0.2;
  const blackboardWidth = width * 0.8;
  const xPosition = width * 0.03;
  const yPosition = height * 0.8;

  // 背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  // 白枠
  ctx.strokeStyle = 'white';
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.strokeRect(xPosition, yPosition, blackboardWidth, blackboardHeight);

  // テキスト
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
