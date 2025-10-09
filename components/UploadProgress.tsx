// components/UploadProgress.tsx
'use client';

import { useEffect, useState } from 'react';
import type { UploadProgress } from '@/types';

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
