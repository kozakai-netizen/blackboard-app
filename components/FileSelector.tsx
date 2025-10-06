// components/FileSelector.tsx
'use client';

import { useRef, useImperativeHandle, forwardRef } from 'react';

interface FileSelectorProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  currentFileCount?: number;
}

export interface FileSelectorRef {
  openDialog: () => void;
}

export const FileSelector = forwardRef<FileSelectorRef, FileSelectorProps>(({
  onFilesSelected,
  maxFiles = 50,
  disabled = false,
  currentFileCount = 0
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const remainingSlots = maxFiles - currentFileCount;
    const files = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots && remainingSlots > 0) {
      alert(`最大${maxFiles}枚まで選択できます。残り${remainingSlots}枚まで追加できます。`);
    } else if (remainingSlots <= 0) {
      alert(`最大${maxFiles}枚に達しています。これ以上追加できません。`);
      e.target.value = '';
      return;
    }

    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = '';
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    openDialog: () => {
      inputRef.current?.click();
    }
  }));

  return (
    <div>
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
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                   font-semibold text-sm transition-colors inline-flex items-center gap-2"
      >
        📷 写真を追加
      </button>
    </div>
  );
});

FileSelector.displayName = 'FileSelector';
