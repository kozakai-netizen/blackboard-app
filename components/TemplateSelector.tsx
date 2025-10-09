// components/TemplateSelector.tsx
'use client';

import { useState } from 'react';
import { TemplatePreviewImage } from './TemplatePreviewImage';
import type { Template } from '@/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
}

export function TemplateSelector({ templates, selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!selectedTemplate) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-yellow-800 text-sm">テンプレートが選択されていません</p>
      </div>
    );
  }

  return (
    <>
      {/* コンパクトな選択中テンプレート表示 */}
      <div className="bg-white rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">選択中:</span>
            <span className="font-medium text-gray-900">{selectedTemplate.name}</span>
            {selectedTemplate.isDefault && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                デフォルト
              </span>
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
          >
            変更
          </button>
        </div>
      </div>

      {/* テンプレート選択モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">テンプレートを選択</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onSelectTemplate(template);
                      setIsModalOpen(false);
                    }}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{template.name}</span>
                        {template.isDefault && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            デフォルト
                          </span>
                        )}
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <span className="text-blue-500">✓</span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    )}

                    <div className="text-xs text-gray-500 mb-2">
                      記載項目({template.fields.length}個): {template.fields.slice(0, 3).join('、')}
                      {template.fields.length > 3 && '...'}
                    </div>

                    {/* 黒板プレビュー */}
                    <TemplatePreviewImage template={template} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
