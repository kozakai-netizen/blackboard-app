// components/SiteTable.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fileStore } from '@/lib/fileStore';

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

type SortKey = 'site_name' | 'updated_at';
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

  // 現場選択→ファイル選択ダイアログを開く
  const handleSiteClick = (site: Site) => {
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
            <thead className="bg-gray-50">
              <tr className="border-b-2 border-gray-200">
                <th
                  onClick={() => handleSort('site_name')}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    現場名 <SortIcon columnKey="site_name" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden md:table-cell">
                  種類
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden xl:table-cell">
                  住所
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">
                  管理担当者
                </th>
                <th
                  onClick={() => handleSort('updated_at')}
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors hidden sm:table-cell"
                >
                  <div className="flex items-center gap-2">
                    更新日 <SortIcon columnKey="updated_at" />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  {/* 空白 */}
                </th>
              </tr>
            </thead>
            <tbody>
              {currentSites.map((site, index) => (
                <tr
                  key={site.site_code}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{site.site_name}</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {site.site_type || '-'}
                  </td>
                  <td className="px-4 py-4">
                    {site.status && (
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          site.status === '進行中'
                            ? 'bg-green-100 text-green-800'
                            : site.status === '完了'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {site.status}
                      </span>
                    )}
                    {!site.status && '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden xl:table-cell">
                    {site.address || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {site.manager_name || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden sm:table-cell">
                    {site.updated_at
                      ? new Date(site.updated_at).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleSiteClick(site)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      📷 アップロード
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 空の状態 */}
        {currentSites.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            現場が見つかりませんでした
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            全 {sortedSites.length} 件中 {startIndex + 1} - {Math.min(endIndex, sortedSites.length)} 件を表示
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← 前へ
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
