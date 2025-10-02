// components/FileSelector.tsx
'use client';

import { useRef } from 'react';

interface FileSelectorProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function FileSelector({
  onFilesSelected,
  maxFiles = 50,
  disabled = false
}: FileSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="w-full py-4 px-6 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   font-bold text-lg transition-colors"
      >
        📷 写真を選ぶ（最大{maxFiles}枚）
      </button>

      <p className="text-sm text-gray-600 text-center">
        ライブラリから写真を選択してください
      </p>
    </div>
  );
}
