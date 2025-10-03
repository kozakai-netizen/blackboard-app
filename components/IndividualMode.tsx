// components/IndividualMode.tsx
'use client';

import { useState, useEffect } from 'react';
import { BlackboardPreview } from './BlackboardPreview';
import { BlackboardForm } from './BlackboardForm';
import { PreviewModal } from './PreviewModal';
import type { BlackboardInfo } from '@/types';

interface IndividualModeProps {
  files: File[];
  projectName: string;
  onSubmit: (assignments: Map<number, BlackboardInfo>) => void;
  onBack: () => void;
}

export function IndividualMode({ files, projectName, onSubmit, onBack }: IndividualModeProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [assignments, setAssignments] = useState<Map<number, BlackboardInfo>>(new Map());
  const [currentBlackboardInfo, setCurrentBlackboardInfo] = useState<BlackboardInfo>({
    projectName,
    workType: '基礎工事',
    weather: '晴れ',
    workContent: '',
    timestamp: new Date()
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // 選択中の1枚目のファイル
  const previewFile = selectedIndices.size > 0
    ? files[Array.from(selectedIndices)[0]]
    : null;

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === files.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(files.map((_, i) => i)));
    }
  };

  const handleApply = () => {
    const newAssignments = new Map(assignments);
    selectedIndices.forEach(index => {
      newAssignments.set(index, { ...currentBlackboardInfo });
    });
    setAssignments(newAssignments);
    setSelectedIndices(new Set());
    alert(`${selectedIndices.size}枚に黒板情報を設定しました`);
  };

  const handleSubmitAll = () => {
    const unassigned = files.length - assignments.size;
    if (unassigned > 0) {
      if (!confirm(`${unassigned}枚が未設定です。これらはスキップして登録しますか？`)) {
        return;
      }
    }
    onSubmit(assignments);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* PC: 3分割、スマホ: タブ切り替え */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 左: 写真一覧 */}
        <div className="lg:col-span-4 bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">写真一覧</h3>
            <button
              onClick={handleToggleAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedIndices.size === files.length ? '全解除' : '全選択'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            選択中: {selectedIndices.size}枚 / 設定済み: {assignments.size}枚
          </p>
          <div className="grid grid-cols-2 gap-2 max-h-[600px] overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                onClick={() => handleToggle(index)}
                className={`relative border-2 rounded cursor-pointer transition-all ${
                  selectedIndices.has(index)
                    ? 'border-blue-500 bg-blue-50'
                    : assignments.has(index)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`${index + 1}`}
                  className="w-full h-24 object-cover rounded"
                />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                {assignments.has(index) && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 中央: プレビュー */}
        <div className="lg:col-span-5">
          {previewFile ? (
            <BlackboardPreview
              imageFile={previewFile}
              blackboardInfo={currentBlackboardInfo}
              onPreviewClick={() => setShowPreviewModal(true)}
            />
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500 h-full flex items-center justify-center">
              写真を選択してください
            </div>
          )}
        </div>

        {/* 右: 黒板情報入力 */}
        <div className="lg:col-span-3">
          <h3 className="font-semibold mb-4">
            黒板情報を入力（選択中 {selectedIndices.size}枚）
          </h3>
          <BlackboardForm
            projectName={projectName}
            onSubmit={(e) => e.preventDefault()}
            onFormChange={setCurrentBlackboardInfo}
            disabled={selectedIndices.size === 0}
            hideSubmitButton={true}
          />
          <button
            onClick={handleApply}
            disabled={selectedIndices.size === 0}
            className="w-full mt-4 py-3 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       font-bold"
          >
            選択中の{selectedIndices.size}枚に適用
          </button>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 underline"
        >
          ← モード選択に戻る
        </button>
        <button
          onClick={handleSubmitAll}
          disabled={assignments.size === 0}
          className="ml-auto px-8 py-3 bg-green-600 text-white rounded-lg
                     hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     font-bold"
        >
          一括登録（{assignments.size}枚）
        </button>
      </div>

      {/* プレビューモーダル */}
      {showPreviewModal && previewFile && (
        <PreviewModal
          imageFile={previewFile}
          blackboardInfo={currentBlackboardInfo}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </div>
  );
}
