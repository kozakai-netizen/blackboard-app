// components/IndividualMode.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
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
    timestamp: new Date()
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 選択中の1枚目のファイル
  const previewFile = selectedIndices.size > 0
    ? files[Array.from(selectedIndices)[0]]
    : null;

  // プレビューモーダル用の黒板情報
  const previewModalBlackboardInfo = previewPhotoIndex !== null
    ? (assignments.get(previewPhotoIndex) || currentBlackboardInfo)
    : currentBlackboardInfo;

  // プレビューモーダル用のファイル
  const previewModalFile = previewPhotoIndex !== null
    ? files[previewPhotoIndex]
    : previewFile;

  // 選択順の配列を生成（選択された順番を保持）
  const getSelectionOrder = (index: number): number | null => {
    if (!selectedIndices.has(index)) return null;
    const selectedArray = Array.from(selectedIndices);
    return selectedArray.indexOf(index) + 1;
  };

  const handleToggle = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);

      // 設定済み写真を選択した場合、その設定をフォームに反映
      if (assignments.has(index)) {
        const existingInfo = assignments.get(index);
        if (existingInfo) {
          setCurrentBlackboardInfo({
            ...existingInfo,
            timestamp: new Date() // 新しいタイムスタンプに更新
          });
        }
      }
    }
    setSelectedIndices(newSelected);
  };

  const handleCheckboxToggle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // 他のクリックイベントを防止
    handleToggle(index);
  };

  const handlePreviewClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // 他のクリックイベントを防止
    // クリックした写真のindexを保存
    setPreviewPhotoIndex(index);
    setShowPreviewModal(true);
  };

  const handleToggleAll = () => {
    if (selectedIndices.size === files.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(files.map((_, i) => i)));
    }
  };

  const handleApply = () => {
    if (selectedIndices.size === 0) return;

    const newAssignments = new Map(assignments);
    const count = selectedIndices.size;

    // 選択中の写真に黒板情報を適用
    selectedIndices.forEach(index => {
      newAssignments.set(index, {
        ...currentBlackboardInfo,
        timestamp: new Date() // 適用時のタイムスタンプ
      });
    });

    setAssignments(newAssignments);
    setSelectedIndices(new Set()); // 選択を解除
    alert(`${count}枚に黒板情報を設定しました`);
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

  // ページネーション計算
  const totalPages = Math.ceil(files.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFiles = files.slice(startIndex, endIndex);

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

          {/* ページネーション情報 */}
          {totalPages > 1 && (
            <div className="text-xs text-gray-500 mb-2">
              {startIndex + 1} - {Math.min(endIndex, files.length)} / {files.length}枚
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            {currentFiles.map((file, idx) => {
              const index = startIndex + idx;
              const selectionOrder = getSelectionOrder(index);
              const isSelected = selectedIndices.has(index);
              const isAssigned = assignments.has(index);

              return (
                <div
                  key={index}
                  className={`relative border-2 rounded transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isAssigned
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {/* チェックボックス（左上・クリック領域拡大） */}
                  <div
                    onClick={(e) => handleCheckboxToggle(e, index)}
                    className="absolute top-0 left-0 z-10 cursor-pointer p-2"
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-400 hover:border-blue-500'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* 写真 */}
                  <div className="relative w-full h-24">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`写真 ${index + 1}`}
                      fill
                      className="object-cover rounded"
                    />
                  </div>

                  {/* 選択順番号（チェックボックスの右横） */}
                  {isSelected && selectionOrder !== null && (
                    <div className="absolute top-1 left-10 bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold">
                      {selectionOrder}
                    </div>
                  )}

                  {/* 設定済みチェックマーク（右上） */}
                  {isAssigned && (
                    <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                      ✓ 設定済
                    </div>
                  )}

                  {/* プレビューボタン（右下） */}
                  <button
                    onClick={(e) => handlePreviewClick(e, index)}
                    className="absolute bottom-1 right-1 z-10 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors"
                    title="プレビュー表示"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ページネーションコントロール */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* 中央: プレビュー */}
        <div className="lg:col-span-5">
          {previewFile ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                選択中の1枚目を表示
              </p>
              <BlackboardPreview
                imageFile={previewFile}
                blackboardInfo={currentBlackboardInfo}
                onPreviewClick={() => setShowPreviewModal(true)}
              />
            </div>
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
            onSubmit={() => {}} // hideSubmitButton=true なので呼ばれない
            onFormChange={setCurrentBlackboardInfo}
            disabled={selectedIndices.size === 0}
            hideSubmitButton={true}
            allowProjectNameEdit={true}
            template={undefined}
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
      {showPreviewModal && previewModalFile && (
        <PreviewModal
          imageFile={previewModalFile}
          blackboardInfo={previewModalBlackboardInfo}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewPhotoIndex(null);
          }}
        />
      )}
    </div>
  );
}
