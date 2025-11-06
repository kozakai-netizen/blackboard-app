// components/SiteTable.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fileStore } from '@/lib/fileStore';
import { SiteChip } from '@/components/ui/SiteChip';
import { statusVariant, typeVariant } from '@/lib/sites/chipStyle';

interface Site {
  site_code: string;
  site_name: string;
  site_type?: string;
  address?: string;
  updated_at?: string;
  manager_name?: string;
  status?: string;
}

interface SiteTableProps {
  sites: Site[];
  placeCode: string;
}

type SortKey = 'site_name' | 'updated_at' | 'site_type' | 'status' | 'address' | 'manager_name';
type SortOrder = 'asc' | 'desc';

export function SiteTable({ sites, placeCode }: SiteTableProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('site_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const itemsPerPage = 10;

  // ソート処理
  const sortedSites = [...sites].sort((a, b) => {
    let aValue = a[sortKey] || '';
    let bValue = b[sortKey] || '';

    if (sortKey === 'updated_at') {
      aValue = new Date(aValue).getTime().toString();
      bValue = new Date(bValue).getTime().toString();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // ページネーション処理
  const totalPages = Math.ceil(sortedSites.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSites = sortedSites.slice(startIndex, endIndex);

  // ソートハンドラ
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // 行クリック→ファイル選択ダイアログを開く
  const handleRowClick = (site: Site) => {
    setSelectedSite(site);
    fileInputRef.current?.click();
  };

  // ファイル選択後→グローバルストアに保存して遷移
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 50);
    if (files.length > 0 && selectedSite) {
      // グローバルストアに保存
      fileStore.setFiles(files, selectedSite.site_code, placeCode);
      // アップロードページへ遷移
      router.push(`/upload?site_code=${selectedSite.site_code}&place_code=${placeCode}`);
    }
    e.target.value = '';
  };


  // ソートアイコン
  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <span className="text-gray-400">↕</span>;
    }
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4">
      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr className="border-b-2 border-gray-200">
                <th
                  onClick={() => handleSort('site_name')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    現場名 <SortIcon columnKey="site_name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('site_type')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors hidden md:table-cell"
                >
                  <div className="flex items-center gap-2">
                    種類 <SortIcon columnKey="site_type" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    ステータス <SortIcon columnKey="status" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('address')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors hidden xl:table-cell"
                >
                  <div className="flex items-center gap-2">
                    住所 <SortIcon columnKey="address" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('manager_name')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors hidden lg:table-cell"
                >
                  <div className="flex items-center gap-2">
                    管理担当者 <SortIcon columnKey="manager_name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('updated_at')}
                  className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors hidden sm:table-cell"
                >
                  <div className="flex items-center gap-2">
                    更新日 <SortIcon columnKey="updated_at" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentSites.map((site, index) => (
                <tr
                  key={site.site_code}
                  onClick={() => handleRowClick(site)}
                  className="hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer group"
                >
                  <td className="px-6 py-5">
                    <div
                      data-testid="site-name"
                      className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors"
                    >
                      {site.site_name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {site.site_code}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-base text-gray-600 hidden md:table-cell">
                    {site.site_type ? (
                      <SiteChip text={site.site_type} variant={typeVariant(site.site_type)} testId="site-type" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {site.status ? (
                      <SiteChip text={site.status} variant={statusVariant(site.status)} testId="site-status" />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td
                    data-testid="site-address"
                    className="px-6 py-5 text-sm text-gray-600 hidden xl:table-cell"
                  >
                    <span className="line-clamp-1">{site.address || '-'}</span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600 hidden lg:table-cell">
                    {site.manager_name || '-'}
                  </td>
                  <td
                    data-testid="site-updated-at"
                    className="px-6 py-5 text-sm text-gray-500 hidden sm:table-cell"
                  >
                    {site.updated_at
                      ? new Date(site.updated_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 空の状態 */}
        {currentSites.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500 font-medium">現場が見つかりませんでした</p>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 font-medium">
              全 {sortedSites.length} 件中 {startIndex + 1} - {Math.min(endIndex, sortedSites.length)} 件を表示
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                ← 前へ
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
              >
                次へ →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
