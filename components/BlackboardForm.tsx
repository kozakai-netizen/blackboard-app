// components/BlackboardForm.tsx
'use client';

import { useState, useEffect } from 'react';
import type { BlackboardInfo, Template } from '@/types';

interface BlackboardFormProps {
  projectName: string;
  onSubmit: (info: BlackboardInfo) => void;
  onFormChange?: (info: BlackboardInfo) => void;
  disabled?: boolean;
  hideSubmitButton?: boolean;
  allowProjectNameEdit?: boolean;
  template: Template; // 必須に変更
  photoCategories?: { id: number; name: string }[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  initialValues?: BlackboardInfo;
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

export function BlackboardForm({
  projectName: initialProjectName,
  onSubmit,
  onFormChange,
  disabled = false,
  hideSubmitButton = false,
  allowProjectNameEdit = false,
  template,
  photoCategories = [],
  selectedCategory = '',
  onCategoryChange,
  initialValues
}: BlackboardFormProps) {
  const [projectName, setProjectName] = useState(allowProjectNameEdit ? '' : initialProjectName);
  const [timestamp, setTimestamp] = useState(new Date());

  // テンプレートのデフォルト値で初期化
  const [workType, setWorkType] = useState((template.defaultValues?.工種 as string) || '');
  const [weather, setWeather] = useState((template.defaultValues?.天候 as string) || '');
  const [workCategory, setWorkCategory] = useState((template.defaultValues?.種別 as string) || '');
  const [workDetail, setWorkDetail] = useState((template.defaultValues?.細別 as string) || '');
  const [contractor, setContractor] = useState((template.defaultValues?.施工者 as string) || '');
  const [location, setLocation] = useState((template.defaultValues?.撮影場所 as string) || '');
  const [station, setStation] = useState((template.defaultValues?.測点位置 as string) || '');
  const [witness, setWitness] = useState((template.defaultValues?.立会者 as string) || '');
  const [remarks, setRemarks] = useState((template.defaultValues?.備考 as string) || '');

  // initialValuesが変更されたら、ローカルstateを更新
  // 依存配列はinitialValuesの個別プロパティのみ（ローカルstateは含めない）
  useEffect(() => {
    if (!initialValues) return;

    if (initialValues.workType !== undefined) {
      setWorkType(initialValues.workType);
    }
    if (initialValues.weather !== undefined) {
      setWeather(initialValues.weather);
    }
    if (initialValues.workCategory !== undefined) {
      setWorkCategory(initialValues.workCategory);
    }
    if (initialValues.workDetail !== undefined) {
      setWorkDetail(initialValues.workDetail);
    }
    if (initialValues.contractor !== undefined) {
      setContractor(initialValues.contractor);
    }
    if (initialValues.location !== undefined) {
      setLocation(initialValues.location);
    }
    if (initialValues.station !== undefined) {
      setStation(initialValues.station);
    }
    if (initialValues.witness !== undefined) {
      setWitness(initialValues.witness);
    }
    if (initialValues.remarks !== undefined) {
      setRemarks(initialValues.remarks);
    }
    if (initialValues.timestamp) {
      setTimestamp(initialValues.timestamp);
    }
  }, [
    initialValues?.workType,
    initialValues?.weather,
    initialValues?.workCategory,
    initialValues?.workDetail,
    initialValues?.contractor,
    initialValues?.location,
    initialValues?.station,
    initialValues?.witness,
    initialValues?.remarks,
    initialValues?.timestamp?.getTime()
  ]);

  // フォーム変更時の通知（デバウンス処理）
  useEffect(() => {
    // 50ms デバウンス: 高速入力時の不要な再描画を防ぐ
    const timeoutId = setTimeout(() => {
      const info: BlackboardInfo = {
        projectName,
        timestamp,
        workType: workType || undefined,
        weather: weather || undefined,
        workCategory: workCategory || undefined,
        workDetail: workDetail || undefined,
        contractor: contractor || undefined,
        location: location || undefined,
        station: station || undefined,
        witness: witness || undefined,
        remarks: remarks || undefined,
      };
      onFormChange?.(info);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [projectName, timestamp.getTime(), workType, weather, workCategory, workDetail, contractor, location, station, witness, remarks, onFormChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const info: BlackboardInfo = {
      projectName,
      timestamp,
      workType: workType || undefined,
      weather: weather || undefined,
      workCategory: workCategory || undefined,
      workDetail: workDetail || undefined,
      contractor: contractor || undefined,
      location: location || undefined,
      station: station || undefined,
      witness: witness || undefined,
      remarks: remarks || undefined,
    };

    onSubmit(info);
  };

  // datetime-local形式の文字列に変換
  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // テンプレートのfieldsに基づいてフィールドを動的レンダリング
  const renderField = (fieldId: string) => {
    // 工事名は常に最初に表示（別処理）
    if (fieldId === '工事名') return null;
    // 撮影日も別処理
    if (fieldId === '撮影日') return null;

    const isRequired = false; // すべてオプショナル

    switch (fieldId) {
      case '工種':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              工種 {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={workType}
              onChange={e => setWorkType(e.target.value)}
              disabled={disabled}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 text-base ${!workType ? 'text-gray-400' : 'text-gray-900'}`}
              required={isRequired}
            >
              <option value="" className="text-gray-400">工種を選択</option>
              {WORK_TYPES.map(type => (
                <option key={type} value={type} className="text-gray-900">{type}</option>
              ))}
            </select>
          </div>
        );

      case '天候':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              天候 {isRequired && <span className="text-red-500">*</span>}
            </label>
            <select
              value={weather}
              onChange={e => setWeather(e.target.value)}
              disabled={disabled}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                         disabled:bg-gray-100 text-base ${!weather ? 'text-gray-400' : 'text-gray-900'}`}
              required={isRequired}
            >
              <option value="" className="text-gray-400">天候を選択</option>
              {WEATHER_OPTIONS.map(w => (
                <option key={w} value={w} className="text-gray-900">{w}</option>
              ))}
            </select>
          </div>
        );

      case '種別':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
            <input
              type="text"
              value={workCategory}
              onChange={e => setWorkCategory(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="種別を入力"
            />
          </div>
        );

      case '細別':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">細別</label>
            <input
              type="text"
              value={workDetail}
              onChange={e => setWorkDetail(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="細別を入力"
            />
          </div>
        );

      case '施工者':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">施工者</label>
            <input
              type="text"
              value={contractor}
              onChange={e => setContractor(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="施工者を入力"
            />
          </div>
        );

      case '撮影場所':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">撮影場所</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="撮影場所を入力"
            />
          </div>
        );

      case '測点位置':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">測点位置</label>
            <input
              type="text"
              value={station}
              onChange={e => setStation(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="測点位置を入力"
            />
          </div>
        );

      case '立会者':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">立会者</label>
            <input
              type="text"
              value={witness}
              onChange={e => setWitness(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base"
              placeholder="立会者を入力"
            />
          </div>
        );

      case '備考':
        return (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              disabled={disabled}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-base resize-none"
              rows={3}
              placeholder="備考を入力"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* 上部: 入力項目エリア */}
      <div className="space-y-4 flex-1">
      {/* 固定項目（全幅） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          工事名 {allowProjectNameEdit && <span className="text-xs text-gray-500">(任意)</span>}
        </label>
        {allowProjectNameEdit ? (
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            disabled={disabled}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-100 text-base"
            placeholder="工事名を入力"
          />
        ) : (
          <div className="p-3 bg-gray-100 rounded border text-gray-700">
            {projectName}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          撮影日時 <span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          value={formatDateTimeLocal(timestamp)}
          onChange={e => setTimestamp(new Date(e.target.value))}
          disabled={disabled}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                     disabled:bg-gray-100 text-base"
          required
        />
      </div>

      {/* 現場写真カテゴリ選択 */}
      {photoCategories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            現場写真カテゴリ <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedCategory}
            onChange={e => onCategoryChange?.(e.target.value)}
            disabled={disabled}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500
                       disabled:bg-gray-100 text-base ${!selectedCategory ? 'text-gray-400' : 'text-gray-900'}`}
            required
          >
            <option value="" className="text-gray-400">カテゴリを選択</option>
            {photoCategories.map(cat => (
              <option key={cat.id} value={cat.name} className="text-gray-900">{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* テンプレート項目（備考以外は2カラムグリッド） */}
      <div className="grid grid-cols-2 gap-4">
        {template.fields
          .filter(f => f !== '工事名' && f !== '撮影日' && f !== '備考')
          .map(fieldId => renderField(fieldId))}
      </div>

        {/* 備考は全幅 */}
        {template.fields.includes('備考') && renderField('備考')}
      </div>

      {/* 下部: 登録ボタン */}
      {!hideSubmitButton && (
        <div className="mt-4 pt-4 border-t">
          <button
            type="submit"
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-base transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            登録する
          </button>
        </div>
      )}
    </form>
  );
}
