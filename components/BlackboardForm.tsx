// components/BlackboardForm.tsx
'use client';

import { useState } from 'react';
import type { BlackboardInfo } from '@/types';

interface BlackboardFormProps {
  projectName: string;
  onSubmit: (info: BlackboardInfo) => void;
  onFormChange?: (info: BlackboardInfo) => void;
  disabled?: boolean;
  hideSubmitButton?: boolean;
}

const WORK_TYPES = [
  '基礎工事',
  '鉄筋工事',
  '型枠工事',
  'コンクリート工事',
  '鉄骨工事',
  '防水工事',
  '左官工事',
  '内装工事',
  '設備工事',
  'その他'
];

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪'];

export function BlackboardForm({ projectName, onSubmit, onFormChange, disabled = false, hideSubmitButton = false }: BlackboardFormProps) {
  const [workType, setWorkType] = useState(WORK_TYPES[0]);
  const [weather, setWeather] = useState(WEATHER_OPTIONS[0]);
  const [workContent, setWorkContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const info: BlackboardInfo = {
      projectName,
      workType,
      weather,
      workContent: workContent.trim() || undefined,
      timestamp: new Date()
    };

    onSubmit(info);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          工事名
        </label>
        <div className="p-3 bg-gray-100 rounded border text-gray-700">
          {projectName}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          工種 <span className="text-red-500">*</span>
        </label>
        <select
          value={workType}
          onChange={e => {
            const newWorkType = e.target.value;
            setWorkType(newWorkType);
            onFormChange?.({
              projectName,
              workType: newWorkType,
              weather,
              workContent: workContent.trim() || undefined,
              timestamp: new Date()
            });
          }}
          disabled={disabled}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 text-base"
          required
        >
          {WORK_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          天候 <span className="text-red-500">*</span>
        </label>
        <select
          value={weather}
          onChange={e => {
            const newWeather = e.target.value;
            setWeather(newWeather);
            onFormChange?.({
              projectName,
              workType,
              weather: newWeather,
              workContent: workContent.trim() || undefined,
              timestamp: new Date()
            });
          }}
          disabled={disabled}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 text-base"
          required
        >
          {WEATHER_OPTIONS.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          作業内容（任意）
        </label>
        <textarea
          value={workContent}
          onChange={e => {
            const newWorkContent = e.target.value;
            setWorkContent(newWorkContent);
            onFormChange?.({
              projectName,
              workType,
              weather,
              workContent: newWorkContent.trim() || undefined,
              timestamp: new Date()
            });
          }}
          disabled={disabled}
          placeholder="配筋検査、型枠組立など"
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 text-base resize-none"
          rows={3}
        />
      </div>

      {!hideSubmitButton && (
        <button
          type="submit"
          disabled={disabled}
          className="w-full py-4 px-6 bg-green-600 text-white rounded-lg
                     hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                     font-bold text-lg transition-colors"
        >
          登録する
        </button>
      )}
    </form>
  );
}
