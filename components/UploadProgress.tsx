// components/UploadProgress.tsx
'use client';

import { useEffect, useState } from 'react';
import type { UploadProgress } from '@/types';

export type UploadStep = 'processing' | 'uploading' | 'saving' | 'complete';

export interface DetailedProgress extends UploadProgress {
  step?: UploadStep;
  currentFile?: string;
  successFiles?: string[];
  failedFiles?: { filename: string; error: string }[];
  apiEndpoint?: string;
  apiParams?: Record<string, any>;
}

interface UploadProgressProps {
  progress: UploadProgress;
  onClose?: () => void;
}

export function UploadProgressToast({ progress, onClose }: UploadProgressProps) {
  const [visible, setVisible] = useState(true);

  const percentage = progress.total > 0 ? Math.floor((progress.completed / progress.total) * 100) : 0;
  const isComplete = progress.total > 0 && progress.completed === progress.total;

  // 完了したら3秒後に自動で閉じる
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onClose]);

  if (progress.total === 0 || !visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 shadow-lg">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <span className="text-xl">✅</span>
            ) : (
              <span className="text-xl animate-pulse">📤</span>
            )}
            <span className="font-bold">
              {isComplete
                ? `完了しました！`
                : `アップロード中... ${progress.completed}/${progress.total}枚`}
            </span>
          </div>
          <span className="text-sm">{percentage}%</span>
        </div>

        <div className="h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {progress.failed > 0 && (
          <div className="mt-2 text-sm text-yellow-200">
            ⚠️ {progress.failed}枚失敗しました
          </div>
        )}

        {progress.current && !isComplete && (
          <div className="mt-2 text-xs text-white/80 truncate">
            処理中: {progress.current}
          </div>
        )}
      </div>
    </div>
  );
}

interface UploadProgressModalProps extends UploadProgressProps {
  onClose?: () => void;
}

export function UploadProgressModal({ progress, onClose }: UploadProgressModalProps) {
  const percentage = Math.floor((progress.completed / progress.total) * 100);
  const isComplete = progress.completed === progress.total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center space-y-4">
          {isComplete ? (
            <>
              <div className="text-6xl">✅</div>
              <h2 className="text-2xl font-bold text-gray-800">完了しました！</h2>
              <p className="text-gray-600">
                {progress.total}枚の電子小黒板写真をアップロードしました
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl animate-pulse">📤</div>
              <h2 className="text-2xl font-bold text-gray-800">処理中...</h2>
              <p className="text-gray-600">
                {progress.completed}/{progress.total}枚 ({percentage}%)
              </p>
            </>
          )}

          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {progress.failed > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ {progress.failed}枚の処理に失敗しました
            </div>
          )}

          {!isComplete && (
            <p className="text-sm text-gray-500">
              ※ 画面を閉じないでお待ちください
            </p>
          )}

          {isComplete && onClose && (
            <button
              onClick={onClose}
              className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 詳細な進捗表示用モーダル（ダンドリワークAPI連携用）
interface DetailedUploadProgressModalProps {
  progress: DetailedProgress;
  onClose?: () => void;
}

export function DetailedUploadProgressModal({ progress, onClose }: DetailedUploadProgressModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const percentage = progress.total > 0 ? Math.floor((progress.completed / progress.total) * 100) : 0;
  const isComplete = progress.step === 'complete' || (progress.total > 0 && progress.completed === progress.total);

  const getStepInfo = (step?: UploadStep) => {
    switch (step) {
      case 'processing':
        return { emoji: '🎨', text: '黒板を合成中...' };
      case 'uploading':
        return { emoji: '📤', text: 'ダンドリワークAPIへアップロード中...' };
      case 'saving':
        return { emoji: '💾', text: 'マニフェスト保存中...' };
      case 'complete':
        return { emoji: '✅', text: '完了しました！' };
      default:
        return { emoji: '⏳', text: '準備中...' };
    }
  };

  const stepInfo = getStepInfo(progress.step);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{stepInfo.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold">{stepInfo.text}</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {progress.completed}/{progress.total}枚 ({percentage}%)
                </p>
              </div>
            </div>
            {isComplete && onClose && (
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* プログレスバー */}
          <div className="mt-4 w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ステップインジケーター */}
          <div className="flex items-center justify-between">
            {['processing', 'uploading', 'saving', 'complete'].map((step, index) => {
              const currentStepIndex = ['processing', 'uploading', 'saving', 'complete'].indexOf(progress.step || 'processing');
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-blue-200' : ''}`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 現在処理中のファイル */}
          {progress.currentFile && !isComplete && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="animate-spin">⚙️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">処理中のファイル</div>
                  <div className="text-xs truncate">{progress.currentFile}</div>
                </div>
              </div>
            </div>
          )}

          {/* API情報表示（モック用） */}
          {progress.step === 'uploading' && progress.apiEndpoint && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">📡 API情報（開発用）</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">TODO: 実装待ち</span>
              </div>
              <div className="text-xs font-mono bg-white p-2 rounded border">
                <div className="text-gray-600">エンドポイント:</div>
                <div className="text-blue-600">{progress.apiEndpoint}</div>
              </div>
              {progress.apiParams && (
                <div className="text-xs font-mono bg-white p-2 rounded border">
                  <div className="text-gray-600">パラメータ:</div>
                  <pre className="text-gray-800 mt-1 overflow-x-auto">{JSON.stringify(progress.apiParams, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* 成功/失敗サマリー */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{progress.completed}</div>
              <div className="text-sm text-green-600">成功</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{progress.failed}</div>
              <div className="text-sm text-red-600">失敗</div>
            </div>
          </div>

          {/* 詳細表示トグル */}
          {(progress.successFiles?.length || progress.failedFiles?.length) && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  {showDetails ? '詳細を非表示' : '詳細を表示'}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDetails && (
                <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                  {/* 成功したファイル */}
                  {progress.successFiles && progress.successFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-green-700">✅ 成功 ({progress.successFiles.length})</h4>
                      {progress.successFiles.map((filename, index) => (
                        <div key={index} className="text-xs bg-green-50 p-2 rounded border border-green-200 truncate">
                          {filename}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 失敗したファイル */}
                  {progress.failedFiles && progress.failedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-red-700">❌ 失敗 ({progress.failedFiles.length})</h4>
                      {progress.failedFiles.map((item, index) => (
                        <div key={index} className="bg-red-50 p-2 rounded border border-red-200">
                          <div className="text-xs font-medium truncate">{item.filename}</div>
                          <div className="text-xs text-red-600 mt-1">{item.error}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 完了メッセージ */}
          {isComplete && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-green-700 font-medium">
                {progress.failed === 0
                  ? `${progress.total}枚すべてのアップロードが完了しました！`
                  : `${progress.completed}枚のアップロードが完了しました（${progress.failed}枚失敗）`}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="border-t bg-gray-50 p-4">
          {!isComplete && (
            <p className="text-sm text-gray-500 text-center">
              ⚠️ 画面を閉じないでお待ちください
            </p>
          )}
          {isComplete && onClose && (
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
