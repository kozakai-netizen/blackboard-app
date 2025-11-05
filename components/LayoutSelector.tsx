// components/LayoutSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Layout } from '@/types';

interface LayoutSelectorProps {
  value?: string | null;
  onChange: (id: string) => void;
}

export default function LayoutSelector({ value, onChange }: LayoutSelectorProps) {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLayouts() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/layouts?system_only=1');
        if (!res.ok) throw new Error('レイアウトの取得に失敗しました');
        const data = await res.json();
        setLayouts(data.layouts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    }
    fetchLayouts();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">レイアウト</label>
        <div className="text-sm text-gray-500">レイアウト読込中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">レイアウト</label>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  const sortedLayouts = [...layouts].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">レイアウト選択</label>
      <select
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors hover:border-blue-400"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          レイアウトを選択してください
        </option>
        {sortedLayouts.map((layout) => (
          <option key={layout.id} value={layout.id}>
            {layout.name} ({layout.layout_key})
          </option>
        ))}
      </select>
      {value && (
        <p className="text-xs text-gray-500">
          選択中: {sortedLayouts.find((l) => l.id === value)?.description}
        </p>
      )}
    </div>
  );
}
