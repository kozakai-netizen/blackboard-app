'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SiteTable } from '@/components/SiteTable'
import { SiteCard } from '@/components/SiteCard'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

interface PlaceSetting {
  place_code: string
  setting_type: string
  setting_id: number
  default_name: string | null
  custom_name: string
  display_order: number | null
}

export default function SitesPage() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [filteredSites, setFilteredSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('すべて')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    '現調中（見積未提出）',
    '現調中（見積提出済み）',
    '工事中'
  ])
  const [userType, setUserType] = useState<string | null>(null)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [placeSettings, setPlaceSettings] = useState<PlaceSetting[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sortKey, setSortKey] = useState<'site_name' | 'updated_at'>('site_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 詳細検索フィルター
  const [keyword, setKeyword] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [managerFilter, setManagerFilter] = useState('')
  const [subManagerFilter, setSubManagerFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [roleManagerFilter, setRoleManagerFilter] = useState('')

  // ユーザー一覧（プルダウン用）
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([])

  // usersテーブルからユーザー一覧を取得
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data, error } = await supabase
          .from('users')
          .select('user_id, name')
          .order('name', { ascending: true })

        if (error) {
          console.error('❌ Failed to load users:', error)
        } else if (data) {
          console.log('✅ Users loaded:', data.length)
          setUsers(data)
        }
      } catch (error) {
        console.error('❌ Error loading users:', error)
      }
    }
    loadUsers()
  }, [])

  // ユーザー情報を取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserType(sessionStorage.getItem('userType'))
      // ローカルストレージから会社ロゴを読み込み
      const savedLogo = localStorage.getItem('companyLogo')
      if (savedLogo) {
        setCompanyLogo(savedLogo)
      }
    }
  }, [])

  // 会社ロゴアップロード処理
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 画像ファイルのみ許可
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }

      // ファイルサイズチェック (2MB以下)
      if (file.size > 2 * 1024 * 1024) {
        alert('ファイルサイズは2MB以下にしてください')
        return
      }

      // FileReaderで画像を読み込み
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setCompanyLogo(dataUrl)
        // ローカルストレージに保存
        localStorage.setItem('companyLogo', dataUrl)
      }
      reader.readAsDataURL(file)
    }
    // input値をリセット（同じファイルを再選択可能にする）
    e.target.value = ''
  }

  // ロゴ削除処理
  const handleLogoRemove = () => {
    setCompanyLogo(null)
    localStorage.removeItem('companyLogo')
  }

  // ハンバーガーメニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // プレイス設定マスタを取得
  useEffect(() => {
    const loadPlaceSettings = async () => {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data, error } = await supabase
          .from('place_settings')
          .select('*')
          .eq('place_code', 'dandoli-sample1')
          .order('display_order', { ascending: true })

        if (error) {
          console.error('❌ Failed to load place_settings:', error)
        } else if (data) {
          console.log('✅ Place settings loaded:', data.length)
          setPlaceSettings(data)
        }
      } catch (error) {
        console.error('❌ Error loading place_settings:', error)
      }
    }

    loadPlaceSettings()
  }, [])

  // プレイス設定マスタから名称を取得する関数（メモ化）
  const getCustomName = useCallback((settingType: string, settingId: number): string => {
    if (placeSettings.length === 0) {
      // マスタ未読み込み時はデフォルト名を返す
      if (settingType === 'site_status') {
        switch (settingId) {
          case 1: return '追客中'
          case 2: return '契約中'
          case 3: return '着工中'
          case 4: return '完工'
          case 5: return '中止'
          case 6: return '他決'
          default: return '未設定'
        }
      } else if (settingType === 'site_type') {
        switch (settingId) {
          case 1: return 'リフォーム'
          case 2: return '新築'
          case 3: return 'その他'
          default: return '未設定'
        }
      }
      return '未設定'
    }

    const setting = placeSettings.find(
      s => s.setting_type === settingType && s.setting_id === settingId
    )
    return setting?.custom_name || setting?.default_name || '未設定'
  }, [placeSettings])

  useEffect(() => {
    const loadSites = async () => {
      console.log('🔵 Starting to load sites...')
      setIsLoading(true)

      try {
        const placeCode = 'dandoli-sample1'
        const userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null
        const currentUserType = typeof window !== 'undefined' ? sessionStorage.getItem('userType') : null

        console.log('👤 Current user:', { userId, userType: currentUserType })

        // 元請の場合は全現場を取得
        let url = `/api/dandori/sites?place_code=${placeCode}`
        console.log('🔍 Fetching all sites')

        const response = await fetch(url)

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

            // プレイス設定マスタから名称を取得
            const siteTypeName = site.site_type
              ? getCustomName('site_type', site.site_type)
              : '種別未設定'

            const statusName = site.site_status
              ? getCustomName('site_status', site.site_status)
              : '進行中'

            // デバッグ：未設定の現場をログ出力
            if (siteTypeName === '未設定' || siteTypeName === '種別未設定') {
              console.log(`⚠️ Site with missing type: ${site.name}, site_type=${site.site_type}`)
            }

            return {
              site_code: siteCode,
              site_name: site.name || '現場名未設定',
              site_type: siteTypeName,
              address: site.address || '住所未設定',
              updated_at: site.modified || new Date().toISOString(),
              created_at: site.created || new Date().toISOString(),
              status: statusName,
              manager_name: site.manager?.admin || '',
              sub_manager_name: site.sub_manager?.admin || '',
              role: site.role?.name || '',
              role_manager_name: site.role_manager?.admin || '',
              owner_name: site.customer?.name || '',
              place_code: site.place_code || placeCode
            };
          });

          // ステータス別の件数を集計（元のsite_status値も確認）
          const statusCounts: { [key: string]: number } = {}
          const rawStatusCounts: { [key: number]: number } = {}

          data.data.forEach((site: any) => {
            const rawStatus = site.site_status
            rawStatusCounts[rawStatus] = (rawStatusCounts[rawStatus] || 0) + 1
          })

          formattedSites.forEach(site => {
            const status = site.status || '不明'
            statusCounts[status] = (statusCounts[status] || 0) + 1
          })

          console.log(`📊 Total sites loaded: ${formattedSites.length}`)
          console.log('📊 Raw API site_status:', rawStatusCounts)
          console.log('📊 Formatted status:', statusCounts)

          // ユーザーが参加している現場のみフィルタ（site_membersテーブルと突合）
          if (userId) {
            try {
              const supabase = createClient(supabaseUrl, supabaseAnonKey)
              const { data: siteMembers, error } = await supabase
                .from('site_members')
                .select('site_code')
                .eq('user_id', userId)

              if (error) {
                console.error('❌ Failed to fetch site_members:', error)
              } else if (siteMembers && siteMembers.length > 0) {
                const userSiteCodes = siteMembers.map(m => m.site_code)
                console.log(`👥 User ${userId} is in ${userSiteCodes.length} sites:`, userSiteCodes)

                const filteredByUser = formattedSites.filter(site =>
                  userSiteCodes.includes(site.site_code)
                )
                console.log(`🔍 Filtered by user participation: ${formattedSites.length} → ${filteredByUser.length}`)

                setSites(filteredByUser)
                return
              } else {
                console.log(`⚠️ User ${userId} is not in any sites`)
              }
            } catch (error) {
              console.error('❌ Error filtering by user:', error)
            }
          }

          setSites(formattedSites)
          // filteredSitesはuseEffectで自動的にフィルタされる
        }
      } catch (error) {
        console.error('🔴 Error:', error)
        setError('現場情報の読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadSites()
  }, [getCustomName])

  useEffect(() => {
    let result = sites
    console.log(`🔍 Start filtering: ${result.length} sites, selectedStatuses:`, selectedStatuses)

    // ステータスフィルタリング
    if (selectedStatuses.length > 0) {
      result = result.filter(site => selectedStatuses.includes(site.status || ''))
      console.log(`🔍 Status filter (${selectedStatuses.join(', ')}): ${result.length}`)
    }

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

    console.log(`🔍 Filtering result: ${result.length} sites`)
    setFilteredSites(result)
  }, [
    searchTerm, selectedType, selectedStatuses, sites,
    keyword, createdFrom, createdTo, managerFilter, subManagerFilter, roleFilter, roleManagerFilter,
    placeSettings
  ])

  // ソート機能
  const handleSort = (key: 'site_name' | 'updated_at') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // ソート済みサイト一覧
  const sortedSites = [...filteredSites].sort((a, b) => {
    let aValue = a[sortKey] || ''
    let bValue = b[sortKey] || ''

    if (sortKey === 'updated_at') {
      aValue = new Date(aValue).getTime().toString()
      bValue = new Date(bValue).getTime().toString()
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // ステータス別の件数を計算
  const getStatusStats = () => {
    // ダンドリワークの現場ステータス設定の順序通り
    const statusOrder = [
      '全て',
      '現調中（見積未提出）',
      '現調中（見積提出済み）',
      '工事中',
      '完工',
      'アフター',
      '中止・他決'
    ]

    // 順序を保持するためにMapを使用
    const stats = new Map<string, number>()

    // 全てを最初に設定
    stats.set('全て', filteredSites.length)

    // 6つのステータスを初期化
    statusOrder.slice(1).forEach(status => {
      stats.set(status, 0)
    })

    // フィルタ後のサイトでカウント
    filteredSites.forEach((site) => {
      const status = site.status
      if (status) {
        if (stats.has(status)) {
          stats.set(status, (stats.get(status) || 0) + 1)
        } else if (status === '中止' || status === '他決') {
          // 中止と他決を「中止・他決」にまとめる
          stats.set('中止・他決', (stats.get('中止・他決') || 0) + 1)
        }
      }
    })

    return stats
  }

  const statusStats = getStatusStats()

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
            <div className="flex items-center gap-4">
              {/* ハンバーガーメニュー（左側） */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                {/* ドロップダウンメニュー */}
                {showMenu && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/admin')
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <span>⚙️</span>
                        <span>管理画面</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/templates')
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <span>📋</span>
                        <span>テンプレート管理</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/users')
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <span>👥</span>
                        <span>ユーザー管理</span>
                      </button>
                      <button
                        onClick={() => {
                          router.push('/admin/site-members')
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <span>🏗️</span>
                        <span>現場参加者管理</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 会社ロゴエリア */}
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                {companyLogo ? (
                  <div className="relative">
                    <img
                      src={companyLogo}
                      alt="会社ロゴ"
                      className="h-16 w-16 object-contain bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <button
                      onClick={handleLogoRemove}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="ロゴを削除"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-16 w-16 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="会社ロゴをアップロード"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">現場一覧</h1>
                <p className="mt-1 text-sm text-gray-600">
                  現場を選択して写真をアップロードして電子小黒板を設定できます
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {Array.from(statusStats.entries()).map(([status, count]) => {
            const getStatusColor = (status: string) => {
              switch (status) {
                case '全て':
                  return 'bg-gray-50 border-gray-300 text-gray-800'
                case '現調中（見積未提出）':
                  return 'bg-yellow-50 border-yellow-300 text-yellow-800'
                case '現調中（見積提出済み）':
                  return 'bg-green-50 border-green-300 text-green-800'
                case '工事中':
                  return 'bg-blue-50 border-blue-300 text-blue-800'
                case '完工':
                  return 'bg-orange-50 border-orange-300 text-orange-800'
                case 'アフター':
                  return 'bg-purple-50 border-purple-300 text-purple-800'
                case '中止・他決':
                  return 'bg-pink-50 border-pink-300 text-pink-800'
                default:
                  return 'bg-gray-50 border-gray-200 text-gray-800'
              }
            }

            const isSelected = status === '全て'
              ? selectedStatuses.length === 0 || selectedStatuses.length === 7
              : selectedStatuses.includes(status)

            return (
              <div
                key={status}
                onClick={() => {
                  if (status === '全て') {
                    // 全て選択/解除をトグル
                    if (selectedStatuses.length === 7 || selectedStatuses.length === 0) {
                      setSelectedStatuses([])
                    } else {
                      setSelectedStatuses([
                        '現調中（見積未提出）',
                        '現調中（見積提出済み）',
                        '工事中',
                        '完工',
                        'アフター',
                        '中止・他決'
                      ])
                    }
                  } else {
                    // 個別ステータスの選択/解除をトグル
                    if (selectedStatuses.includes(status)) {
                      setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                    } else {
                      setSelectedStatuses([...selectedStatuses, status])
                    }
                  }
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${getStatusColor(status)} ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
              >
                <div className="text-xs font-medium mb-1">{status}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* ツールバー */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>詳細検索</span>
                <span className="text-sm">{showAdvancedSearch ? '▲' : '▼'}</span>
              </button>

              {/* ソートボタン */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleSort('site_name')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    sortKey === 'site_name'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  現場名 {sortKey === 'site_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('updated_at')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    sortKey === 'updated_at'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  更新日 {sortKey === 'updated_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>

            {/* 表示切り替えボタン */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="カード表示"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="リスト表示"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* モーダル */}
          {showAdvancedSearch && (
            <>
              {/* 背景オーバーレイ（ぼかし） */}
              <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
                onClick={() => setShowAdvancedSearch(false)}
              />

              {/* 中央モーダル */}
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white shadow-2xl z-50 overflow-y-auto rounded-xl">
                <div className="p-6">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">🔍 詳細検索</h2>
                    <button
                      onClick={() => setShowAdvancedSearch(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* キーワード検索 */}
                    <div>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        現場作成日
                      </label>
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">開始日</label>
                          <input
                            type="date"
                            value={createdFrom}
                            onChange={(e) => setCreatedFrom(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors hover:border-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">終了日</label>
                          <input
                            type="date"
                            value={createdTo}
                            onChange={(e) => setCreatedTo(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors hover:border-blue-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 現場管理担当者 */}
                    <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現場管理担当者
                  </label>
                  <select
                    value={managerFilter}
                    onChange={(e) => setManagerFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  >
                    <option value="">すべて</option>
                    {users.map((user) => (
                      <option key={user.user_id} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                    {/* サブ担当者 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        サブ担当者
                      </label>
                      <select
                        value={subManagerFilter}
                        onChange={(e) => setSubManagerFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="">すべて</option>
                        {users.map((user) => (
                          <option key={user.user_id} value={user.name}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 役職 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        役職
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="">すべて</option>
                        {placeSettings
                          .filter(s => s.setting_type === 'role')
                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                          .map(s => (
                            <option key={s.setting_id} value={s.custom_name}>
                              {s.custom_name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 役職担当者 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        役職担当者
                      </label>
                      <select
                        value={roleManagerFilter}
                        onChange={(e) => setRoleManagerFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="">すべて</option>
                        {users.map((user) => (
                          <option key={user.user_id} value={user.name}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
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
                  {sortedSites.length} 件の現場が見つかりました
                </p>
              </div>

              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedSites.map((site) => (
                    <SiteCard key={site.site_code} site={site} placeCode={'dandoli-sample1'} />
                  ))}
                </div>
              ) : (
                <SiteTable sites={sortedSites} placeCode={'dandoli-sample1'} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
