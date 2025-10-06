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

  const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE || 'dandoli-sample1';

  useEffect(() => {
    const loadSites = async () => {
      console.log('🔵 Starting to load sites...')
      setIsLoading(true)

      try {
        console.log('🔵 Fetching /api/dandori/sites with place_code:', placeCode)
        const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`)
        console.log('🔵 API response received:', response.status)
        const data = await response.json()
        console.log('🔵 Data from API:', data)

        if (data.result && data.data && Array.isArray(data.data)) {
          const formattedSites = data.data.map((site: any, index: number) => ({
            site_code: site.site_code || `NO_CODE_${index}`,
            site_name: site.name || '現場名未設定',
            site_type: site.site_type || '種別未設定',
            address: site.address || '住所未設定',
            updated_at: site.updated_at || new Date().toISOString(),
            created_at: site.created_at || new Date().toISOString(),
            status: site.status || '進行中',
            manager_name: site.manager_name || '',
            sub_manager_name: site.sub_manager_name || '',
            role: site.role || '',
            role_manager_name: site.role_manager_name || '',
            owner_name: site.owner_name || '',
            place_code: site.place_code || ''
          }))

          console.log('🔵 Formatted sites count:', formattedSites.length)
          setSites(formattedSites)
          setFilteredSites(formattedSites)
        } else {
          console.error('🔴 Invalid data structure:', data)
        }
      } catch (error) {
        console.error('🔴 Error loading sites:', error)
        setError('現場情報の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
        console.log('🔵 Loading complete')
      }
    }

    loadSites()
  }, []);

  useEffect(() => {
    filterSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (error) {
      console.error('Failed to fetch sites:', error);
      const errorMessage = error instanceof Error ? error.message : '現場データの取得に失敗しました';
      setError(errorMessage);
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
