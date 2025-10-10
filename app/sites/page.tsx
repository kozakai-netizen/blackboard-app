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
  const [sortKey, setSortKey] = useState<'site_name' | 'updated_at'>('site_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // モーダルのドラッグ状態
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

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

  // 初期データを並列で読み込み（users + place_settings + sites）
  useEffect(() => {
    const loadAllData = async () => {
      console.log('🔵 Starting to load all data in parallel...')
      setIsLoading(true)
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      try {
        const placeCode = 'dandoli-sample1'
        const userId = typeof window !== 'undefined' ? sessionStorage.getItem('userId') : null

        // 3つのデータソースを並列読み込み
        const [usersResult, settingsResult, sitesResponse] = await Promise.all([
          supabase
            .from('users')
            .select('user_id, name')
            .order('name', { ascending: true }),
          supabase
            .from('place_settings')
            .select('*')
            .eq('place_code', placeCode)
            .order('display_order', { ascending: true }),
          fetch(`/api/dandori/sites?place_code=${placeCode}`)
        ])

        // Users設定
        if (usersResult.error) {
          console.error('❌ Failed to load users:', usersResult.error)
        } else if (usersResult.data) {
          console.log('✅ Users loaded:', usersResult.data.length)
          console.log('📋 Sample users:', usersResult.data.slice(0, 3))
          setUsers(usersResult.data)
        }

        // Place settings設定
        let loadedSettings: PlaceSetting[] = []
        if (settingsResult.error) {
          console.error('❌ Failed to load place_settings:', settingsResult.error)
        } else if (settingsResult.data) {
          console.log('✅ Place settings loaded:', settingsResult.data.length)
          loadedSettings = settingsResult.data
          setPlaceSettings(settingsResult.data)
        }

        // Sites処理
        if (!sitesResponse.ok) {
          throw new Error(`HTTP error! status: ${sitesResponse.status}`)
        }

        const sitesData = await sitesResponse.json()
        console.log('✅ Sites API response:', sitesData)

        if (sitesData.result && sitesData.data && Array.isArray(sitesData.data)) {
          // getCustomName関数をローカルに実装
          const getCustomNameLocal = (settingType: string, settingId: number): string => {
            if (loadedSettings.length === 0) {
              // デフォルト名を返す
              if (settingType === 'site_status') {
                const statusMap: { [key: number]: string } = {
                  1: '追客中', 2: '契約中', 3: '着工中', 4: '完工', 5: '中止', 6: '他決'
                }
                return statusMap[settingId] || '進行中'
              }
              return '未設定'
            }
            const setting = loadedSettings.find(
              s => s.setting_type === settingType && s.setting_id === settingId
            )
            return setting?.custom_name || setting?.default_name || '未設定'
          }

          const formattedSites = sitesData.data.map((site: any, index: number) => {
            let siteCode = site.site_code
            if (!siteCode && site.url) {
              const match = site.url.match(/\/sites\/(\d+)/)
              if (match) siteCode = match[1]
            }
            if (!siteCode) siteCode = `NO_CODE_${index}`

            const siteTypeName = site.site_type
              ? getCustomNameLocal('site_type', site.site_type)
              : '種別未設定'

            const statusName = site.site_status
              ? getCustomNameLocal('site_status', site.site_status)
              : '進行中'

            // 担当者IDから名前を取得
            const managerUserId = site.manager?.admin || site.manager?.sub_admin1 || site.manager?.sub_admin2 || site.manager?.sub_admin3
            const managerUser = managerUserId ? usersResult.data?.find(u => u.user_id === managerUserId) : null
            const managerName = managerUser?.name || ''

            // デバッグログ（最初の現場で担当者IDがある場合のみ）
            if (index === 0 && managerUserId) {
              console.log('🔍 Manager lookup:', {
                managerUserId,
                managerUser,
                managerName,
                usersCount: usersResult.data?.length,
                sampleUserIds: usersResult.data?.slice(0, 5).map(u => u.user_id)
              })
            }

            return {
              site_code: siteCode,
              site_name: site.name || '現場名未設定',
              site_type: siteTypeName,
              address: site.address || '住所未設定',
              updated_at: site.modified || new Date().toISOString(),
              created_at: site.created || new Date().toISOString(),
              status: statusName,
              manager_name: managerName,
              sub_manager_name: site.sub_manager?.admin || '',
              role: site.role?.name || '',
              role_manager_name: site.role_manager?.admin || '',
              owner_name: site.customer?.name || '',
              place_code: site.place_code || placeCode
            }
          })

          console.log(`✅ Total sites loaded: ${formattedSites.length}`)

          // ユーザーフィルタリング
          if (userId) {
            try {
              const { data: memberData } = await supabase
                .from('site_members')
                .select('site_code')
                .eq('user_id', userId)

              if (memberData && memberData.length > 0) {
                const userSiteCodes = memberData.map(m => m.site_code)
                const filteredBySiteMember = formattedSites.filter(site =>
                  userSiteCodes.includes(site.site_code)
                )
                console.log(`✅ Filtered by site_members: ${filteredBySiteMember.length} sites`)
                setSites(filteredBySiteMember)
              } else {
                setSites(formattedSites)
              }
            } catch (error) {
              console.error('❌ Error filtering by site_members:', error)
              setSites(formattedSites)
            }
          } else {
            setSites(formattedSites)
          }
        } else {
          console.error('❌ Invalid sites data structure')
          setSites([])
        }
      } catch (error) {
        console.error('❌ Error loading data:', error)
        setError(error instanceof Error ? error.message : '読み込みに失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    loadAllData()
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


  // モーダルドラッグハンドラー
  const handleModalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const modalElement = e.currentTarget.parentElement
    if (!modalElement) return

    const rect = modalElement.getBoundingClientRect()

    setIsDragging(true)
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })

    // 初期位置の場合、現在の実際の位置を設定
    if (modalPosition.x === 0 && modalPosition.y === 0) {
      setModalPosition({
        x: rect.left,
        y: rect.top
      })
    }
  }

  const handleModalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setModalPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleModalMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // 検索条件クリア
  const handleClearSearch = () => {
    setKeyword('')
    setCreatedFrom('')
    setCreatedTo('')
    setManagerFilter('')
    setSubManagerFilter('')
    setRoleFilter('')
    setRoleManagerFilter('')
  }

  // 検索実行（モーダルを閉じる）
  const handleSearch = () => {
    setShowAdvancedSearch(false)
  }

  // モーダルドラッグのイベントリスナー
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleModalMouseMove)
      document.addEventListener('mouseup', handleModalMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleModalMouseMove)
      document.removeEventListener('mouseup', handleModalMouseUp)
    }
  }, [isDragging, dragStart])

  // モーダルを閉じた時に位置をリセット
  useEffect(() => {
    if (!showAdvancedSearch) {
      setModalPosition({ x: 0, y: 0 })
    }
  }, [showAdvancedSearch])

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
              {/* ハンバーガーメニュー（ロゴと統合） */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="メニューを開く"
                >
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="会社ロゴ"
                      className="h-16 w-16 object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg">
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
                    </div>
                  )}
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
                      const newStatuses = selectedStatuses.filter(s => s !== status)
                      // 全て解除された場合、デフォルトの3つ（1,2,3）を選択状態に戻す
                      if (newStatuses.length === 0) {
                        setSelectedStatuses([
                          '現調中（見積未提出）',
                          '現調中（見積提出済み）',
                          '工事中'
                        ])
                      } else {
                        setSelectedStatuses(newStatuses)
                      }
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
            </div>

            {/* 表示切り替えボタン */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('card')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="カード表示"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="リスト表示"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* モーダル */}
          {showAdvancedSearch && (
            <>
              {/* 背景オーバーレイ（薄め） */}
              <div
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setShowAdvancedSearch(false)}
              />

              {/* ドラッグ可能なモーダル */}
              <div
                className="fixed w-full max-w-2xl max-h-[80vh] bg-white shadow-2xl z-50 overflow-hidden rounded-xl"
                style={{
                  top: modalPosition.y === 0 ? '50%' : `${modalPosition.y}px`,
                  left: modalPosition.x === 0 ? '50%' : `${modalPosition.x}px`,
                  transform: modalPosition.x === 0 && modalPosition.y === 0 ? 'translate(-50%, -50%)' : 'none',
                  cursor: isDragging ? 'grabbing' : 'default'
                }}
              >
                {/* ドラッグ可能なヘッダー */}
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-500 p-4 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleModalMouseDown}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      🔍 詳細検索
                      <span className="text-xs font-normal text-blue-100">（ドラッグで移動可能）</span>
                    </h2>
                    <button
                      onClick={() => setShowAdvancedSearch(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* スクロール可能なコンテンツエリア */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>
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

                  {/* アクションボタン */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={handleClearSearch}
                      className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                    >
                      クリア
                    </button>
                    <button
                      onClick={handleSearch}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      検索
                    </button>
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
