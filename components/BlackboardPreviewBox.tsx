// components/BlackboardPreviewBox.tsx
import React from 'react'
import type { BlackboardData, BlackboardDesignSettings, LayoutConfig } from '@/types'
import { isLegacyDesign } from '@/types/type-guards'

interface Props {
  selectedFields: string[]
  defaultValues: Partial<BlackboardData>
  designSettings: BlackboardDesignSettings | LayoutConfig
  availableFields: Array<{ id: string; label: string; required: boolean }>
}

export default function BlackboardPreviewBox({
  selectedFields,
  defaultValues,
  designSettings,
  availableFields,
}: Props) {
  // ✅ Union型保護: LayoutConfigは表示未対応（レガシー専用）
  if (!isLegacyDesign(designSettings)) {
    return (
      <div className="rounded border-2 border-amber-400 bg-amber-100 p-3 text-center text-xs text-amber-800">
        新レイアウト方式のテンプレートはプレビュー未対応です
      </div>
    )
  }

  return (
    <div
      className="text-white shadow-xl"
      style={{
        backgroundColor: designSettings.bgColor,
        fontSize: designSettings.fontSize === 'large' ? '1rem' : '0.875rem',
        border: '4px solid rgba(255, 255, 255, 0.5)',
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.6)',
        borderRadius: '4px',
      }}
    >
      {/* 黒板内容（工事名は1列、他は2列） */}
      <div className="p-2">
        <div className="space-y-1">
          {selectedFields.map((fieldId, index) => {
            const field = availableFields.find((f) => f.id === fieldId)
            const value =
              (defaultValues[fieldId as keyof BlackboardData] as string) ||
              (fieldId === '工事名'
                ? '○○マンション新築工事'
                : fieldId === '撮影日'
                ? '2025-10-08'
                : '－')

            // 工事名は1列全幅
            if (fieldId === '工事名') {
              return (
                <div
                  key={fieldId}
                  className="flex items-center border-2 border-white/50 rounded"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div
                    className="py-1 px-2 font-bold text-xs"
                    style={{
                      minWidth: '60px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderRight: '2px solid rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {field?.label}
                  </div>
                  <div className="py-1 px-2 flex-1 text-xs truncate font-medium">
                    {value}
                  </div>
                </div>
              )
            }

            return null
          })}

          {/* 他の項目は2列グリッド */}
          <div className="grid grid-cols-2 gap-1">
            {selectedFields
              .filter((fieldId) => fieldId !== '工事名')
              .map((fieldId) => {
                const field = availableFields.find((f) => f.id === fieldId)
                const value =
                  (defaultValues[fieldId as keyof BlackboardData] as string) ||
                  (fieldId === '撮影日' ? '2025-10-08' : '－')

                return (
                  <div
                    key={fieldId}
                    className="flex items-center border border-white/50 rounded text-[10px]"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div
                      className="py-0.5 px-1.5 font-bold whitespace-nowrap text-center"
                      style={{
                        width: '65px',
                        flexShrink: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                      }}
                    >
                      {field?.label}
                    </div>
                    <div className="py-0.5 px-1.5 flex-1 truncate">
                      {value}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
