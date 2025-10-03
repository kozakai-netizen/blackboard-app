// components/ModeSelector.tsx
'use client';

interface ModeSelectorProps {
  onSelectMode: (mode: 'batch' | 'individual') => void;
  fileCount: number;
}

export function ModeSelector({ onSelectMode, fileCount }: ModeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800 font-medium">
          ✓ {fileCount}枚の写真が選択されています
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          黒板情報の入力方法を選択してください
        </h2>

        <div className="space-y-4">
          {/* 一括設定 */}
          <button
            onClick={() => onSelectMode('batch')}
            className="w-full p-6 bg-white border-2 border-gray-200 rounded-lg
                       hover:border-blue-500 hover:bg-blue-50 transition-all
                       text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">📋</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600">
                  一括設定
                </h3>
                <p className="text-gray-600">
                  全ての写真に同じ黒板情報を付けます
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  同じ工種・天候で撮影した写真をまとめて処理する場合に便利です
                </p>
              </div>
            </div>
          </button>

          {/* 個別設定 */}
          <button
            onClick={() => onSelectMode('individual')}
            className="w-full p-6 bg-white border-2 border-gray-200 rounded-lg
                       hover:border-green-500 hover:bg-green-50 transition-all
                       text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">🔢</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600">
                  個別設定
                </h3>
                <p className="text-gray-600">
                  写真ごとに異なる黒板情報を付けます
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  工種や作業内容が異なる写真を選択している場合はこちら
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <button
        onClick={() => window.history.back()}
        className="text-gray-600 hover:text-gray-800 underline"
      >
        ← 写真を選び直す
      </button>
    </div>
  );
}
