'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SiteTable } from '@/components/SiteTable'

interface Site {
  site_code: string
  site_name: string
  site_type?: string
  address?: string
  updated_at?: string
  created_at?: string
  status?: string
  manager_name?: string
  sub_manager_name?: string
  role?: string
  role_manager_name?: string
  owner_name?: string
  place_code?: string
}

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('すべて')
  const [selectedStatus, setSelectedStatus] = useState('すべて')
  const [userType, setUserType] = useState<string | null>(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

  // 詳細検索フィルター
  const [keyword, setKeyword] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [subManagerFilter, setSubManagerFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [roleManagerFilter, setRoleManagerFilter] = useState('')

  // プルダウン用の選択肢（APIから取得するか、現場データから抽出）
  const [managers, setManagers] = useState<string[]>([])
  const [subManagers, setSubManagers] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [roleManagers, setRoleManagers] = useState<string[]>([])

  // 現場データから選択肢を抽出
  useEffect(() => {
    if (sites.length === 0) return

    const uniqueManagers = Array.from(new Set(sites.map(s => s.manager_name).filter(Boolean))) as string[]
    const uniqueSubManagers = Array.from(new Set(sites.map(s => s.sub_manager_name).filter(Boolean))) as string[]
    const uniqueRoles = Array.from(new Set(sites.map(s => s.role).filter(Boolean))) as string[]
    const uniqueRoleManagers = Array.from(new Set(sites.map(s => s.role_manager_name).filter(Boolean))) as string[]

    setManagers(uniqueManagers)
    setSubManagers(uniqueSubManagers)
    setRoles(uniqueRoles)
    setRoleManagers(uniqueRoleManagers)
  }, [sites])

  // ユーザー情報を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserType(sessionStorage.getItem('userType'))
    }
  }, [])

  useEffect(() => {
    const loadSites = async () => {
      console.log('🔵 Starting to load sites...')
      setIsLoading(true)

      try {
        const placeCode = 'dandoli-sample1'
        const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('🔵 API Response:', data)

        if (data.result && data.data && Array.isArray(data.data)) {
          // 最初の1件をログに出力してフィールド名を確認
          if (data.data.length > 0) {
            console.log('🔵 Sample site data:', data.data[0]);
          }

          const formattedSites = data.data.map((site: any, index: number) => {
            // site_codeが空の場合、URLから現場IDを抽出
            let siteCode = site.site_code;
            if (!siteCode && site.url) {
              const match = site.url.match(/\/sites\/(\d+)/);
              if (match) {
                siteCode = match[1];
              }
            }
            if (!siteCode) {
              siteCode = `NO_CODE_${index}`;
            }

            return {
              site_code: siteCode,
              site_name: site.name || '現場名未設定',
              site_type: site.site_type === 1 ? 'リフォーム' :
                        site.site_type === 2 ? '新築' :
                        site.site_type === 3 ? 'その他' : '種別未設定',
              address: site.address || '住所未設定',
              updated_at: site.modified || new Date().toISOString(),
              created_at: site.created || new Date().toISOString(),
              status: site.site_status === 1 ? '追客中' :
                     site.site_status === 2 ? '契約中' :
                     site.site_status === 3 ? '着工中' :
                     site.site_status === 4 ? '完工' :
                     site.site_status === 5 ? '中止' :
                     site.site_status === 6 ? '他決' : '進行中',
              manager_name: site.manager?.admin || '',
              sub_manager_name: site.sub_manager?.admin || '',
              role: site.role?.name || '',
              role_manager_name: site.role_manager?.admin || '',
              owner_name: site.customer?.name || '',
              place_code: site.place_code || placeCode
            };
          });

          setSites(formattedSites)
          setFilteredSites(formattedSites)
        }
      } catch (error) {
        console.error('🔴 Error:', error)
        setError('現場情報の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadSites()
  }, [])

  useEffect(() => {
    let result = sites

    // 基本検索
    if (searchTerm) {
      result = result.filter(site =>
        site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.site_code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'すべて') {
      result = result.filter(site => site.site_type === selectedType)
    }

    if (selectedStatus !== 'すべて') {
      result = result.filter(site => site.status === selectedStatus)
    }

    // 詳細検索
    if (keyword) {
      const query = keyword.toLowerCase()
      result = result.filter(site =>
        site.site_name.toLowerCase().includes(query) ||
        site.owner_name?.toLowerCase().includes(query) ||
        site.address?.toLowerCase().includes(query)
      )
    }

    if (createdFrom) {
      result = result.filter(site => site.created_at && site.created_at >= createdFrom)
    }

    if (createdTo) {
      result = result.filter(site => site.created_at && site.created_at <= createdTo)
    }

    if (managerFilter) {
      result = result.filter(site =>
        site.manager_name?.toLowerCase().includes(managerFilter.toLowerCase())
      )
    }

    if (subManagerFilter) {
      result = result.filter(site =>
        site.sub_manager_name?.toLowerCase().includes(subManagerFilter.toLowerCase())
      )
    }

    if (roleFilter) {
      result = result.filter(site =>
        site.role?.toLowerCase().includes(roleFilter.toLowerCase())
      )
    }

    if (roleManagerFilter) {
      result = result.filter(site =>
        site.role_manager_name?.toLowerCase().includes(roleManagerFilter.toLowerCase())
      )
    }

    setFilteredSites(result)
  }, [
    searchTerm, selectedType, selectedStatus, sites,
    keyword, createdFrom, createdTo, managerFilter, subManagerFilter, roleFilter, roleManagerFilter
  ])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">現場一覧</h1>
              <p className="mt-1 text-sm text-gray-600">
                現場を選択して写真をアップロードして電子小黒板を設定できます
              </p>
            </div>

            {/* 元請アカウントのみ管理画面リンクを表示 */}
            {userType === 'motoduke' && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>管理画面</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現場名
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 現場名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                現場種類
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option>すべて</option>
                <option>新築</option>
                <option>リフォーム</option>
                <option>その他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option>すべて</option>
                <option>追客中</option>
                <option>契約中</option>
                <option>着工中</option>
                <option>完工</option>
                <option>中止</option>
                <option>他決</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              🔍 詳細検索 {showAdvancedSearch ? '▲' : '▼'}
            </button>
          </div>

          {showAdvancedSearch && (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="grid grid-cols-12 gap-3">
                {/* キーワード検索 */}
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
                <div className="col-span-3">
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
                <div className="col-span-3">
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

                {/* 役職 */}
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    役職
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

                {/* 役職担当者 */}
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    役職担当者
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
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">現場情報を読み込んでいます...</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  {filteredSites.length} 件の現場が見つかりました
                </p>
              </div>
              <SiteTable sites={filteredSites} placeCode={'dandoli-sample1'} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
