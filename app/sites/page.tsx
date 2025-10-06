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
  manager_name?: string;
  created_at?: string;
  owner_name?: string;
  sub_manager_name?: string;
  role?: string;
  role_manager_name?: string;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 基本検索
  const [siteName, setSiteName] = useState('');
  const [siteTypeFilter, setSiteTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 詳細検索
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [subManagerFilter, setSubManagerFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleManagerFilter, setRoleManagerFilter] = useState('');

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
        created_at: "2025-09-01T09:00:00Z",
        status: "進行中",
        manager_name: "田中太郎",
        sub_manager_name: "鈴木一郎",
        role: "施工管理",
        role_manager_name: "山田次郎",
        owner_name: "山田建設株式会社",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE002",
        site_name: "△△ビル改修工事",
        site_type: "土木工事",
        address: "大阪府大阪市〇〇区1-2-3",
        updated_at: "2025-10-02T14:20:00Z",
        created_at: "2025-08-15T10:00:00Z",
        status: "進行中",
        manager_name: "佐藤花子",
        sub_manager_name: "田中美咲",
        role: "安全管理",
        role_manager_name: "伊藤太郎",
        owner_name: "鈴木不動産",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE003",
        site_name: "××橋梁補修工事",
        site_type: "土木工事",
        address: "神奈川県横浜市〇〇区5-6-7",
        updated_at: "2025-10-01T09:15:00Z",
        created_at: "2025-07-20T08:30:00Z",
        status: "完了",
        manager_name: "高橋一郎",
        sub_manager_name: "佐々木健",
        role: "品質管理",
        role_manager_name: "中村花子",
        owner_name: "横浜市役所",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE004",
        site_name: "□□駅前再開発工事",
        site_type: "建築工事",
        address: "東京都新宿区〇〇2-3-4",
        updated_at: "2025-09-30T16:45:00Z",
        created_at: "2025-06-10T11:00:00Z",
        status: "進行中",
        manager_name: "田中太郎",
        sub_manager_name: "小林誠",
        role: "施工管理",
        role_manager_name: "山田次郎",
        owner_name: "都市開発株式会社",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE005",
        site_name: "◇◇公園整備工事",
        site_type: "造園工事",
        address: "千葉県千葉市〇〇区8-9-10",
        updated_at: "2025-09-28T11:00:00Z",
        created_at: "2025-08-01T09:30:00Z",
        status: "進行中",
        manager_name: "伊藤次郎",
        sub_manager_name: "渡辺修",
        role: "工程管理",
        role_manager_name: "加藤美咲",
        owner_name: "千葉市役所",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE006",
        site_name: "☆☆トンネル工事",
        site_type: "土木工事",
        address: "静岡県静岡市〇〇区11-12-13",
        updated_at: "2025-09-25T08:30:00Z",
        created_at: "2025-05-15T10:00:00Z",
        status: "進行中",
        manager_name: "佐藤花子",
        sub_manager_name: "田中美咲",
        role: "安全管理",
        role_manager_name: "伊藤太郎",
        owner_name: "静岡県庁",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE007",
        site_name: "●●ショッピングモール新築工事",
        site_type: "建築工事",
        address: "愛知県名古屋市〇〇区14-15-16",
        updated_at: "2025-09-20T13:20:00Z",
        created_at: "2025-04-01T09:00:00Z",
        status: "完了",
        manager_name: "高橋一郎",
        sub_manager_name: "佐々木健",
        role: "品質管理",
        role_manager_name: "中村花子",
        owner_name: "モール開発株式会社",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE008",
        site_name: "▲▲上下水道工事",
        site_type: "設備工事",
        address: "福岡県福岡市〇〇区17-18-19",
        updated_at: "2025-09-15T10:10:00Z",
        created_at: "2025-07-10T08:00:00Z",
        status: "進行中",
        manager_name: "伊藤次郎",
        sub_manager_name: "渡辺修",
        role: "工程管理",
        role_manager_name: "加藤美咲",
        owner_name: "福岡市水道局",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE009",
        site_name: "■■学校校舎改修工事",
        site_type: "建築工事",
        address: "北海道札幌市〇〇区20-21-22",
        updated_at: "2025-09-10T15:40:00Z",
        created_at: "2025-06-20T10:30:00Z",
        status: "進行中",
        manager_name: "田中太郎",
        sub_manager_name: "鈴木一郎",
        role: "施工管理",
        role_manager_name: "山田次郎",
        owner_name: "札幌市教育委員会",
        place_code: "TEST_PLACE_001"
      },
      {
        site_code: "SITE010",
        site_name: "◆◆浄水場設備更新工事",
        site_type: "設備工事",
        address: "宮城県仙台市〇〇区23-24-25",
        updated_at: "2025-09-05T09:00:00Z",
        created_at: "2025-05-01T09:00:00Z",
        status: "完了",
        manager_name: "佐藤花子",
        sub_manager_name: "田中美咲",
        role: "安全管理",
        role_manager_name: "伊藤太郎",
        owner_name: "仙台市水道局",
        place_code: "TEST_PLACE_001"
      }
    ];

    setSites(mockSites);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    filterSites();
  }, [sites, siteName, siteTypeFilter, statusFilter, keyword, createdFrom, createdTo, managerFilter, subManagerFilter, roleFilter, roleManagerFilter]);

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

    // 基本検索：現場名
    if (siteName) {
      const query = siteName.toLowerCase();
      filtered = filtered.filter((site) =>
        site.site_name.toLowerCase().includes(query)
      );
    }

    // 基本検索：現場種類
    if (siteTypeFilter) {
      filtered = filtered.filter((site) => site.site_type === siteTypeFilter);
    }

    // 基本検索：ステータス
    if (statusFilter) {
      filtered = filtered.filter((site) => site.status === statusFilter);
    }

    // 詳細検索：キーワード（現場名・施主氏名・住所）
    if (keyword) {
      const query = keyword.toLowerCase();
      filtered = filtered.filter(
        (site) =>
          site.site_name.toLowerCase().includes(query) ||
          site.owner_name?.toLowerCase().includes(query) ||
          site.address?.toLowerCase().includes(query)
      );
    }

    // 詳細検索：作成日（From）
    if (createdFrom) {
      filtered = filtered.filter(
        (site) => site.created_at && site.created_at >= createdFrom
      );
    }

    // 詳細検索：作成日（To）
    if (createdTo) {
      filtered = filtered.filter(
        (site) => site.created_at && site.created_at <= createdTo + 'T23:59:59Z'
      );
    }

    // 詳細検索：現場管理担当者
    if (managerFilter) {
      filtered = filtered.filter((site) => site.manager_name === managerFilter);
    }

    // 詳細検索：サブ担当者
    if (subManagerFilter) {
      filtered = filtered.filter((site) => site.sub_manager_name === subManagerFilter);
    }

    // 詳細検索：役割
    if (roleFilter) {
      filtered = filtered.filter((site) => site.role === roleFilter);
    }

    // 詳細検索：役割担当者
    if (roleManagerFilter) {
      filtered = filtered.filter((site) => site.role_manager_name === roleManagerFilter);
    }

    setFilteredSites(filtered);
  }

  function handleClearFilters() {
    setSiteName('');
    setSiteTypeFilter('');
    setStatusFilter('');
    setKeyword('');
    setCreatedFrom('');
    setCreatedTo('');
    setManagerFilter('');
    setSubManagerFilter('');
    setRoleFilter('');
    setRoleManagerFilter('');
  }

  // 現場種類の一覧を取得（重複除去）
  const siteTypes = Array.from(new Set(sites.map((s) => s.site_type).filter(Boolean)));

  // ステータスの一覧を取得（重複除去）
  const statuses = Array.from(new Set(sites.map((s) => s.status).filter(Boolean)));

  // 管理担当者の一覧を取得（重複除去）
  const managers = Array.from(new Set(sites.map((s) => s.manager_name).filter(Boolean)));

  // サブ担当者の一覧を取得（重複除去）
  const subManagers = Array.from(new Set(sites.map((s) => s.sub_manager_name).filter(Boolean)));

  // 役割の一覧を取得（重複除去）
  const roles = Array.from(new Set(sites.map((s) => s.role).filter(Boolean)));

  // 役割担当者の一覧を取得（重複除去）
  const roleManagers = Array.from(new Set(sites.map((s) => s.role_manager_name).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            現場一覧
          </h1>
          <p className="text-gray-600">
            現場を選択して写真をアップロードして電子小黒板を設定できます
          </p>
        </div>

        {/* 検索・フィルタエリア */}
        <div className="bg-white rounded-lg border border-gray-200 shadow p-6 space-y-4">
          {/* 基本検索エリア */}
          <div className="grid grid-cols-12 gap-3 items-end">
            {/* 現場名 */}
            <div className="col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現場名
              </label>
              <input
                type="text"
                placeholder="現場名で検索..."
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* 現場種類 */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現場種類
              </label>
              <select
                value={siteTypeFilter}
                onChange={(e) => setSiteTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">すべて</option>
                {siteTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* ステータス */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">すべて</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* 検索ボタン */}
            <div className="col-span-2">
              <button
                onClick={filterSites}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                検索
              </button>
            </div>
          </div>

          {/* 詳細検索トグルボタン */}
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-600 hover:underline font-medium flex items-center gap-2 transition-colors"
            >
              🔍 詳細検索 {showAdvanced ? '▲' : '▼'}
            </button>
          </div>

          {/* 詳細検索エリア（折りたたみ式） */}
          {showAdvanced && (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-12 gap-3">
                {/* キーワード */}
                <div className="col-span-12">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    キーワード（現場名・施主氏名・住所）
                  </label>
                  <input
                    type="text"
                    placeholder="キーワードで検索..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* 現場作成日 */}
                <div className="col-span-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現場作成日
                  </label>
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <input
                      type="date"
                      value={createdFrom}
                      onChange={(e) => setCreatedFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-gray-500 text-sm">〜</span>
                    <input
                      type="date"
                      value={createdTo}
                      onChange={(e) => setCreatedTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 現場管理担当者 */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現場管理担当者
                  </label>
                  <select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">すべて</option>
                    {managers.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager}
                      </option>
                    ))}
                  </select>
                </div>

                {/* サブ担当者 */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    サブ担当者
                  </label>
                  <select
                    value={subManagerFilter}
                    onChange={(e) => setSubManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">すべて</option>
                    {subManagers.map((subManager) => (
                      <option key={subManager} value={subManager}>
                        {subManager}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 役割 */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    役割
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">すべて</option>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 役割担当者 */}
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    役割担当者
                  </label>
                  <select
                    value={roleManagerFilter}
                    onChange={(e) => setRoleManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">すべて</option>
                    {roleManagers.map((roleManager) => (
                      <option key={roleManager} value={roleManager}>
                        {roleManager}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* フィルタクリアボタン（詳細検索内） */}
              {(keyword || createdFrom || createdTo || managerFilter || subManagerFilter || roleFilter || roleManagerFilter) && (
                <div className="pt-2">
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    すべてのフィルタをクリア
                  </button>
                </div>
              )}
            </div>
          )}

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
