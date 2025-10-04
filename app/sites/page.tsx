// app/sites/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SiteTable } from '@/components/SiteTable';

interface Site {
  site_code: string;
  site_name: string;
  site_type?: string;
  address?: string;
  updated_at?: string;
  status?: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [siteTypeFilter, setSiteTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const placeCode = 'TEST_PLACE_001'; // モック用の固定値（本番環境では環境変数に戻す）

  useEffect(() => {
    // fetchSites(); // 本番環境ではコメント解除

    // モックデータ（検証用）
    const mockSites = [
      {
        site_code: "SITE001",
        site_name: "〇〇マンション新築工事",
        site_type: "建築工事",
        address: "東京都渋谷区〇〇1-2-3",
        updated_at: "2025-10-03T10:30:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE002",
        site_name: "△△ビル改修工事",
        site_type: "土木工事",
        address: "大阪府大阪市〇〇区1-2-3",
        updated_at: "2025-10-02T14:20:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE003",
        site_name: "××橋梁補修工事",
        site_type: "土木工事",
        address: "神奈川県横浜市〇〇区5-6-7",
        updated_at: "2025-10-01T09:15:00Z",
        status: "完了",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE004",
        site_name: "□□駅前再開発工事",
        site_type: "建築工事",
        address: "東京都新宿区〇〇2-3-4",
        updated_at: "2025-09-30T16:45:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE005",
        site_name: "◇◇公園整備工事",
        site_type: "造園工事",
        address: "千葉県千葉市〇〇区8-9-10",
        updated_at: "2025-09-28T11:00:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE006",
        site_name: "☆☆トンネル工事",
        site_type: "土木工事",
        address: "静岡県静岡市〇〇区11-12-13",
        updated_at: "2025-09-25T08:30:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE007",
        site_name: "●●ショッピングモール新築工事",
        site_type: "建築工事",
        address: "愛知県名古屋市〇〇区14-15-16",
        updated_at: "2025-09-20T13:20:00Z",
        status: "完了",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE008",
        site_name: "▲▲上下水道工事",
        site_type: "設備工事",
        address: "福岡県福岡市〇〇区17-18-19",
        updated_at: "2025-09-15T10:10:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE009",
        site_name: "■■学校校舎改修工事",
        site_type: "建築工事",
        address: "北海道札幌市〇〇区20-21-22",
        updated_at: "2025-09-10T15:40:00Z",
        status: "進行中",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE010",
        site_name: "◆◆浄水場設備更新工事",
        site_type: "設備工事",
        address: "宮城県仙台市〇〇区23-24-25",
        updated_at: "2025-09-05T09:00:00Z",
        status: "完了",
        place_code: "TEST_PLACE_001"
      }
    ];

    setSites(mockSites);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    filterSites();
  }, [sites, searchQuery, siteTypeFilter, statusFilter]);

  async function fetchSites() {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`);

      if (!response.ok) {
        throw new Error('現場データの取得に失敗しました');
      }

      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setSites(data.data);
        setError('');
      } else {
        throw new Error('データ形式が不正です');
      }
    } catch (error: any) {
      console.error('Failed to fetch sites:', error);
      setError(error.message || '現場データの取得に失敗しました');
      setSites([]); // エラー時は空配列を設定
    } finally {
      setIsLoading(false); // 必ず実行される
    }
  }

  function filterSites() {
    let filtered = sites;

    // 検索クエリでフィルタ（現場名・現場コード）
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.site_name.toLowerCase().includes(query) ||
          site.site_code.toLowerCase().includes(query)
      );
    }

    // 現場種類でフィルタ
    if (siteTypeFilter) {
      filtered = filtered.filter((site) => site.site_type === siteTypeFilter);
    }

    // ステータスでフィルタ
    if (statusFilter) {
      filtered = filtered.filter((site) => site.status === statusFilter);
    }

    setFilteredSites(filtered);
  }

  // 現場種類の一覧を取得（重複除去）
  const siteTypes = Array.from(new Set(sites.map((s) => s.site_type).filter(Boolean)));

  // ステータスの一覧を取得（重複除去）
  const statuses = Array.from(new Set(sites.map((s) => s.status).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            現場一覧
          </h1>
          <p className="text-gray-600">
            現場を選択して写真をアップロードできます
          </p>
        </div>

        {/* 検索・フィルタエリア */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 検索バー */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 検索
              </label>
              <input
                type="text"
                placeholder="現場名または現場コードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* 現場種類フィルタ */}
            {siteTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  現場種類
                </label>
                <select
                  value={siteTypeFilter}
                  onChange={(e) => setSiteTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {siteTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ステータスフィルタ */}
            {statuses.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ステータス
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* フィルタクリア */}
            {(searchQuery || siteTypeFilter || statusFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSiteTypeFilter('');
                    setStatusFilter('');
                  }}
                  className="w-full px-4 py-3 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  フィルタをクリア
                </button>
              </div>
            )}
          </div>

          {/* 検索結果数 */}
          <div className="text-sm text-gray-600 pt-2 border-t">
            {filteredSites.length} 件の現場が見つかりました
            {filteredSites.length !== sites.length && (
              <span className="text-gray-400"> （全{sites.length}件中）</span>
            )}
          </div>
        </div>

        {/* ローディング */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">現場データを読み込み中...</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              ⚠️ {error}
            </p>
            <button
              onClick={fetchSites}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              再試行
            </button>
          </div>
        )}

        {/* テーブル */}
        {!isLoading && !error && (
          <SiteTable sites={filteredSites} placeCode={placeCode} />
        )}
      </div>
    </div>
  );
}
