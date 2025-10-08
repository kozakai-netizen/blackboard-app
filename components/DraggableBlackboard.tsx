// components/DraggableBlackboard.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import type { BlackboardData, BlackboardDesignSettings } from '@/types'
import BlackboardPreviewBox from './BlackboardPreviewBox'

interface Props {
  selectedFields: string[]
  defaultValues: Partial<BlackboardData>
  designSettings: BlackboardDesignSettings
  availableFields: Array<{ id: string; label: string; required: boolean }>
  onPositionChange: (position: { x: number; y: number }) => void
  onSizeChange?: (width: number) => void
  imageUrl?: string
}

export default function DraggableBlackboard({
  selectedFields,
  defaultValues,
  designSettings,
  availableFields,
  onPositionChange,
  onSizeChange,
  imageUrl,
}: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [position, setPosition] = useState(designSettings.position)
  const [size, setSize] = useState({
    width: designSettings.width || 80,
    height: designSettings.height || 20
  })
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const blackboardRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0, aspectRatio: 0 })

  // 初回マウント時のみサイズを設定
  useEffect(() => {
    setSize({
      width: designSettings.width || 35,
      height: designSettings.height || 20
    })
  }, [])

  // 位置のみ同期（サイズは同期しない）
  useEffect(() => {
    setPosition(designSettings.position)
  }, [designSettings.position.x, designSettings.position.y])

  // 黒板の実際のサイズを監視（デバッグ用）
  useEffect(() => {
    if (blackboardRef.current && containerRef.current) {
      const blackboardRect = blackboardRef.current.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()

      // 縦横比を計算（項目数が変わると高さも変わる）
      if (blackboardRect.width > 0 && blackboardRect.height > 0) {
        const ratio = blackboardRect.height / blackboardRect.width
        setAspectRatio(ratio)
      }
    }
  }, [selectedFields, defaultValues])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !blackboardRef.current) return

    setIsDragging(true)
    const containerRect = containerRef.current.getBoundingClientRect()
    const blackboardRect = blackboardRef.current.getBoundingClientRect()

    // ドラッグ開始位置を記録
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: blackboardRect.left - containerRect.left,
      posY: blackboardRect.top - containerRect.top,
    }

    e.preventDefault()
  }

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    if (!containerRef.current || !blackboardRef.current) return

    setIsResizing(true)
    setResizeHandle(handle)
    const containerRect = containerRef.current.getBoundingClientRect()
    const blackboardRect = blackboardRef.current.getBoundingClientRect()

    // リサイズ開始位置とサイズを記録
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: blackboardRect.width,
      height: blackboardRect.height,
      posX: blackboardRect.left - containerRect.left,
      posY: blackboardRect.top - containerRect.top,
      aspectRatio: aspectRatio || (blackboardRect.height / blackboardRect.width),
    }

    e.preventDefault()
    e.stopPropagation()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || !blackboardRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()

    if (isDragging) {
      const blackboardRect = blackboardRef.current.getBoundingClientRect()

      // マウスの移動量を計算
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      // 新しい位置（ピクセル単位）
      let newPosX = dragStartRef.current.posX + deltaX
      let newPosY = dragStartRef.current.posY + deltaY

      // コンテナからはみ出さないように制限
      const maxX = containerRect.width - blackboardRect.width
      const maxY = containerRect.height - blackboardRect.height

      newPosX = Math.max(0, Math.min(newPosX, maxX))
      newPosY = Math.max(0, Math.min(newPosY, maxY))

      // パーセンテージに変換
      const newX = (newPosX / containerRect.width) * 100
      const newY = (newPosY / containerRect.height) * 100

      setPosition({ x: newX, y: newY })
    } else if (isResizing && resizeHandle) {
      // リサイズ処理
      const deltaX = e.clientX - resizeStartRef.current.x

      let newWidth = resizeStartRef.current.width
      let newHeight = resizeStartRef.current.height
      let newPosX = resizeStartRef.current.posX
      let newPosY = resizeStartRef.current.posY

      const ratio = resizeStartRef.current.aspectRatio

      // 四隅ハンドル：縦横比を保ったままリサイズ
      let widthDelta = 0

      if (resizeHandle.includes('e')) {
        widthDelta = deltaX
      } else if (resizeHandle.includes('w')) {
        widthDelta = -deltaX
      }

      newWidth = resizeStartRef.current.width + widthDelta
      newHeight = newWidth * ratio

      // 位置の調整
      if (resizeHandle.includes('w')) {
        newPosX = resizeStartRef.current.posX - widthDelta
      }
      if (resizeHandle.includes('n')) {
        const heightDelta = newHeight - resizeStartRef.current.height
        newPosY = resizeStartRef.current.posY - heightDelta
      }

      // 最小サイズ制限（コンテナの15%以上）
      const minWidth = containerRect.width * 0.15
      newWidth = Math.max(minWidth, newWidth)
      newHeight = newWidth * ratio

      // コンテナからはみ出さないように制限
      // 右下ハンドル（'se'）の場合：位置は固定、サイズだけ制限
      if (resizeHandle === 'se') {
        // 下端チェック（縦横比より優先）
        if (newPosY + newHeight > containerRect.height) {
          newHeight = containerRect.height - newPosY
        }

        // 右端チェック
        if (newPosX + newWidth > containerRect.width) {
          newWidth = containerRect.width - newPosX
        }
      } else {
        // その他のハンドル：位置を調整して拡大を続ける
        if (newPosX + newWidth > containerRect.width) {
          const overflow = newPosX + newWidth - containerRect.width
          newPosX = Math.max(0, newPosX - overflow)
          if (newPosX + newWidth > containerRect.width) {
            newWidth = containerRect.width - newPosX
            newHeight = newWidth * ratio
          }
        }

        if (newPosY + newHeight > containerRect.height) {
          const overflow = newPosY + newHeight - containerRect.height
          newPosY = Math.max(0, newPosY - overflow)
          if (newPosY + newHeight > containerRect.height) {
            newHeight = containerRect.height - newPosY
            newWidth = newHeight / ratio
          }
        }

        if (newPosX < 0) {
          newWidth = newWidth + newPosX
          newPosX = 0
          newHeight = newWidth * ratio
        }

        if (newPosY < 0) {
          newHeight = newHeight + newPosY
          newPosY = 0
          newWidth = newHeight / ratio
        }
      }

      // パーセンテージに変換
      const widthPercent = (newWidth / containerRect.width) * 100
      const heightPercent = (newHeight / containerRect.height) * 100
      const xPercent = (newPosX / containerRect.width) * 100
      const yPercent = (newPosY / containerRect.height) * 100

      setSize({ width: widthPercent, height: heightPercent })
      setPosition({ x: xPercent, y: yPercent })
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      onPositionChange(position)
    }
    if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
      if (onSizeChange) {
        onSizeChange(size.width)
      }
      onPositionChange(position)
    }
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, position, size])

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden border-2 border-gray-300"
      style={{
        aspectRatio: '4/3',
        minHeight: '400px',
        backgroundImage: imageUrl
          ? `url(${imageUrl})`
          : 'linear-gradient(135deg, #8B7355 0%, #D2B48C 50%, #A0826D 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 背景オーバーレイ（画像がない場合のみ） */}
      {!imageUrl && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600/20 to-yellow-900/20"></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px),
                repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 11px)
              `,
            }}
          ></div>
          <div className="absolute top-4 left-0 right-0 flex justify-center">
            <div className="text-center text-gray-700/50">
              <div className="text-sm font-bold tracking-wider bg-white/80 px-4 py-2 rounded-lg shadow-lg">
                📷 ここに現場写真が表示されます
              </div>
            </div>
          </div>
        </>
      )}

      {/* ドラッグ可能な黒板 */}
      <div
        ref={blackboardRef}
        className={`absolute group ${isDragging ? 'cursor-grabbing' : isResizing ? '' : 'cursor-grab'}`}
        style={{
          left: `${position.x}%`,
          top: `${position.y}%`,
          width: `${size.width}%`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ transform: `scale(${aspectRatio ? 1 : 1})`, transformOrigin: 'top left' }}>
          <BlackboardPreviewBox
            selectedFields={selectedFields}
            defaultValues={defaultValues}
            designSettings={designSettings}
            availableFields={availableFields}
          />
        </div>

        {/* リサイズハンドル（右下のみ） */}
        {!isDragging && !isResizing && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
        )}

        {/* ドラッグヒント */}
        {!isDragging && !isResizing && (
          <div className="absolute -top-8 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
              ドラッグで移動 | 右下でサイズ変更
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
