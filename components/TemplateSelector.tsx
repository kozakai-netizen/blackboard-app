// components/TemplateSelector.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { TemplatePreviewImage } from './TemplatePreviewImage';
import type { Template } from '@/types';

interface TemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template) => void;
}

export function TemplateSelector({ templates, selectedTemplate, onSelectTemplate }: TemplateSelectorProps) {
  const [confirmTemplate, setConfirmTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // モーダル表示時に選択中のテンプレートまでスクロール
  useEffect(() => {
    if (selectedButtonRef.current) {
      selectedButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  // 検索フィルタリング
  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedTemplate) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-yellow-800 text-sm">テンプレートが選択されていません</p>
      </div>
    );
  }

  return (
    <>
      {/* テンプレート選択モーダル */}
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => onSelectTemplate(selectedTemplate)}>
        <div
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-auto p-0"
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div className="sticky top-0 bg-white border-b z-10">
              <div className="p-2 flex items-center justify-between">
                <h3 className="text-base font-semibold">テンプレートを選択</h3>
                <button
                  onClick={() => onSelectTemplate(selectedTemplate)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-2 pb-2 flex justify-end">
                <input
                  type="text"
                  placeholder="🔍 テンプレート名で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-3 py-1.5 border-2 border-gray-200 rounded-md focus:border-blue-500 focus:outline-none text-sm placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="p-2 overflow-y-auto" style={{ width: '100%', flex: 1 }}>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>該当するテンプレートが見つかりません</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem', width: '100%' }}>
                  {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    ref={selectedTemplate?.id === template.id ? selectedButtonRef : null}
                    onClick={() => {
                      if (selectedTemplate?.id !== template.id) {
                        setConfirmTemplate(template);
                      }
                    }}
                    className={`text-left p-2 rounded-lg border-2 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{template.name}</span>
                        {template.isDefault && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            デフォルト
                          </span>
                        )}
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <span className="text-blue-500 text-sm">✓</span>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-xs text-gray-600 mb-1">{template.description}</p>
                    )}

                    {/* 黒板プレビュー */}
                    <div className="overflow-hidden">
                      <TemplatePreviewImage template={template} scale={0.5} />
                    </div>
                  </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 確認ポップアップ */}
      {confirmTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              テンプレートを変更しますか？
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              選択中: <span className="font-medium">{selectedTemplate?.name}</span>
            </p>
            <p className="text-sm text-gray-600 mb-6">
              変更先: <span className="font-medium text-blue-600">{confirmTemplate.name}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onSelectTemplate(confirmTemplate);
                  setConfirmTemplate(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
