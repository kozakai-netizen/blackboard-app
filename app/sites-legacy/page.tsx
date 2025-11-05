'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SiteTable } from '@/components/SiteTable'
import { SiteCard } from '@/components/SiteCard'
import { createClient } from '@supabase/supabase-js'
import { fetchTrace } from '@/lib/utils/fetchTrace'
import { resolveEffectiveUserId, type UserIdSource } from '@/lib/user/resolveUserId'
import { siteIncludesUserDetailed, type UserKeys } from '@/lib/sites/match'

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
  manager?: any
  casts?: any[]
  workers?: any[]
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'site_name' | 'updated_at'>('site_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null)
  const [userSource, setUserSource] = useState<UserIdSource>('none')
  const [nofilter, setNofilter] = useState(false)
  const [userKeys, setUserKeys] = useState<UserKeys | null>(null)
  const [provider, setProvider] = useState<'dandori' | 'stg' | null>(null)
  const [matchCount, setMatchCount] = useState<number>(0)
  const [matchReason, setMatchReason] = useState<string>('')
  const DEFAULT_UID = Number(process.env.NEXT_PUBLIC_DEFAULT_USER_ID ?? 40824)
  const healedRef = useRef(false)

  // デバッグモード
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

  // アップロード方法選択モーダル
  const [showUploadMethodModal, setShowUploadMethodModal] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categories, setCategories] = useState<Array<{ category_id: number; photo_count: number }>>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

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
  const [roleManagerFilter, setRoleManagerFilter] = useState('')

  // ユーザー一覧（プルダウン用）
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([])

  // 再実行ガード
  const initRef = useRef(false)
  const fallbackRef = useRef(false)

  // 初期データを並列で読み込み（users + place_settings + sites）
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const loadAllData = async () => {
      console.log('[sites] effect:start - Loading all data...')
      setIsLoading(true)
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      try {
        const placeCode = 'dandoli-sample1'

        // Resolve effective userId with verification
        const { userId: resolvedUserId, source } = await resolveEffectiveUserId()
        setEffectiveUserId(resolvedUserId)
        setUserSource(source)

        console.log('[sites] Resolved userId:', resolvedUserId, 'source:', source)

        // ユーザーキー取得
        let userKeysData: UserKeys | null = null
        try {
          const ukRes = await fetch(`/api/stg-user-keys?id=${resolvedUserId}`, { cache: 'no-store' })
          const ukJson = await ukRes.json()
          if (ukJson?.user) {
            userKeysData = {
              id: ukJson.user.id,
              employee_code: ukJson.user.employee_code,
              login_id: ukJson.user.login_id
            }
            setUserKeys(userKeysData)
            console.log('[sites] User keys loaded:', userKeysData)
          }
        } catch (e) {
          console.error('[sites] Failed to load user keys:', e)
        }

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
          fetchTrace(`/api/dandori/sites?place_code=${placeCode}`, { cache: 'no-store' })
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
          console.log('📊 [Sites] place_settings data:', settingsResult.data)
          console.log('📸 [Sites] photo_category settings:', settingsResult.data.filter(s => s.setting_type === 'photo_category'))
          loadedSettings = settingsResult.data
          setPlaceSettings(settingsResult.data)
        }

        // Sites処理
        if (!sitesResponse.ok) {
          throw new Error(`HTTP error! status: ${sitesResponse.status}`)
        }

        const sitesData = await sitesResponse.json()
        console.log('✅ Sites API response:', sitesData)

        // DW APIが0件を返した場合、STGにフォールバック
        const dwSitesCount = sitesData?.data?.length ?? 0
        if (dwSitesCount === 0) {
          console.warn('⚠️ DW API returned 0 sites, falling back to STG...')
          setProvider('stg')
          // STGフォールバック処理は下のcatch節に任せる
          throw new Error('DW returned 0 sites, fallback to STG')
        }

        setProvider('dandori') // DW APIから取得できた

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
              place_code: site.place_code || placeCode,
              // 現場参加者情報を保持
              manager: site.manager,
              casts: site.casts || [],
              workers: site.workers || []
            }
          })

          console.log(`✅ Total sites loaded: ${formattedSites.length}`)
          console.log('📋 Sample site data (first 3):', formattedSites.slice(0, 3).map(s => ({
            site_name: s.site_name,
            manager: s.manager,
            casts: s.casts,
            workers: s.workers
          })))

          // 全データを保存（フィルタリングはuseEffectで行う）
          setSites(formattedSites)
        } else {
          console.error('❌ Invalid sites data structure')
          setSites([])
        }
      } catch (error) {
        console.error('❌ Error loading DW data:', error)

        // STG APIにフォールバック
        if (!fallbackRef.current) {
          fallbackRef.current = true
          console.log('🔄 Falling back to STG API...')
          setProvider('stg')

          try {
            const stgResponse = await fetch('/api/stg-sites?limit=200', { cache: 'no-store' })
            const stgData = await stgResponse.json()

            if (stgData?.sites && Array.isArray(stgData.sites)) {
              console.log(`✅ STG API: loaded ${stgData.sites.length} sites`)

              // STGデータをフォーマット
              const formattedSites = stgData.sites.map((site: any, index: number) => ({
                site_code: site.site_code || `STG_${index}`,
                site_name: site.site_name || '現場名未設定',
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
                place_code: site.place_code || 'dandoli-sample1',
                manager: site.manager || {},
                casts: site.casts || [],
                workers: site.workers || []
              }))

              setSites(formattedSites)
              setShowFallbackBanner(true)
            } else {
              throw new Error('STG API returned invalid data')
            }
          } catch (stgError) {
            console.error('❌ STG API also failed:', stgError)
            setError('DW API、STG API両方とも読み込みに失敗しました')
            setSites([])
          }
        } else {
          setError(error instanceof Error ? error.message : '読み込みに失敗しました')
        }
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

    // ユーザーベースフィルタリング（userKeysがある場合）
    if (userKeys && !nofilter) {
      const beforeUserFilter = result.length
      const matchResults: string[] = []
      result = result.filter(site => {
        const match = siteIncludesUserDetailed(site, userKeys)
        if (match.matched && match.reason) {
          matchResults.push(match.reason)
        }
        return match.matched
      })
      const count = result.length
      setMatchCount(count)
      if (matchResults.length > 0) {
        setMatchReason(matchResults[0]) // 最初の一致理由を保存
      }
      console.log(`🔍 User filter (userKeys): ${beforeUserFilter} → ${count} sites, reason: ${matchResults[0] || 'none'}`)
    }

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

    if (roleManagerFilter) {
      result = result.filter(site =>
        site.role_manager_name?.toLowerCase().includes(roleManagerFilter.toLowerCase())
      )
    }

    console.log(`🔍 Filtering result: ${result.length} sites`)
    setFilteredSites(result)
  }, [
    searchTerm, selectedType, selectedStatuses, sites,
    keyword, createdFrom, createdTo, managerFilter, subManagerFilter, roleManagerFilter,
    placeSettings, userKeys, nofilter
  ])

  // Auto-heal: session user with 0 matches → switch to DEFAULT_UID
  useEffect(() => {
    if (typeof window === 'undefined') return

    const len = filteredSites?.length ?? 0
    const hasQueryUserId = new URLSearchParams(window.location.search).get('user_id')

    if (!healedRef.current && userSource === 'session' && len === 0 && !hasQueryUserId) {
      healedRef.current = true
      const oldUserId = sessionStorage.getItem('userId')
      console.warn('[sites] auto-heal: session user has 0 match → switch to DEFAULT', {
        from: oldUserId,
        to: DEFAULT_UID
      })
      sessionStorage.setItem('userId', String(DEFAULT_UID))
      window.location.replace('/sites?debug=1&healed=session-zero')
    }
  }, [userSource, filteredSites?.length, DEFAULT_UID])

  // ソート機能
  const handleSort = (key: 'site_name' | 'updated_at') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // ロゴアップロード処理
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('ファイルサイズは2MB以下にしてください')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setCompanyLogo(dataUrl)
        localStorage.setItem('companyLogo', dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  // ロゴ削除
  const handleRemoveLogo = () => {
    setCompanyLogo(null)
    localStorage.removeItem('companyLogo')
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

                {/* 隠しファイル入力 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
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

            {/* デバッグバナー */}
            {debug && (
              <div className="p-2 my-2 text-sm rounded bg-yellow-50 border border-yellow-200" data-testid="debug-banner">
                <div className="flex items-center justify-between">
                  <div>
                    <div><b>DEBUG</b> effectiveUserId: {String(effectiveUserId)} / source: {userSource} / nofilter: {String(nofilter)}</div>
                    <div>Provider: {provider || 'loading...'} / Match: {filteredSites?.length ?? 0} {matchReason && `(例: ${matchReason})`}</div>
                    <div>Total sites: {sites?.length ?? 0} / Filtered: {filteredSites?.length ?? 0}</div>
                  </div>
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('userId')
                      location.reload()
                    }}
                    className="px-3 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                  >
                    ユーザーIDをリセット
                  </button>
                </div>
              </div>
            )}

            {/* フォールバックバナー（0件時に全件表示している旨を通知） */}
            {showFallbackBanner && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">紐づく現場がありません</p>
                    <p className="text-sm">詳細検索から全現場を検索できます。</p>
                  </div>
                </div>
              </div>
            )}

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

                    {/* 現場の種類 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        現場の種類
                      </label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                      >
                        <option value="すべて">すべて</option>
                        {placeSettings
                          .filter(s => s.setting_type === 'site_type')
                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                          .map(s => (
                            <option key={s.setting_id} value={s.custom_name}>
                              {s.custom_name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* 役割担当者 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        役割担当者
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
                    <SiteCard
                      key={site.site_code}
                      site={site}
                      placeCode={'dandoli-sample1'}
                      onCardClick={(site) => {
                        setSelectedSite(site)
                        setShowUploadMethodModal(true)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <SiteTable sites={sortedSites} placeCode={'dandoli-sample1'} />
              )}
            </>
          )}
        </div>
      </div>

      {/* アップロード方法選択モーダル */}
      {showUploadMethodModal && selectedSite && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowUploadMethodModal(false)}
          />

          {/* モーダル本体 */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white shadow-2xl z-50 rounded-xl p-6">
            {/* ヘッダー */}
            <div className="mb-6">
              <button
                onClick={() => setShowUploadMethodModal(false)}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← 閉じる
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedSite.site_name}
              </h1>
              <p className="text-gray-600 mt-1">アップロード方法を選択してください</p>
            </div>

            {/* 選択肢カード */}
            <div className="space-y-4">
              {/* 現場写真から選択 */}
              <button
                onClick={async () => {
                  console.log('📸 [Modal] Loading categories...')
                  setLoadingCategories(true)
                  try {
                    const response = await fetch(`/api/stg-photo-categories?site_code=${selectedSite.site_code}`)
                    console.log('📸 [Modal] Response status:', response.status)

                    if (!response.ok) {
                      const errorData = await response.json()
                      console.error('❌ API Error:', errorData)
                      alert(`カテゴリ取得エラー: ${errorData.error || 'Unknown error'}`)
                      setLoadingCategories(false)
                      return
                    }

                    const data = await response.json()
                    console.log('📸 [Modal] Categories loaded:', data)
                    setCategories(data.categories)
                    setShowUploadMethodModal(false)
                    setShowCategoryModal(true)
                  } catch (error) {
                    console.error('❌ Failed to load categories:', error)
                    alert(`カテゴリ読み込みエラー: ${error}`)
                  } finally {
                    setLoadingCategories(false)
                  }
                }}
                disabled={loadingCategories}
                className="w-full bg-white border-2 border-blue-500 rounded-xl p-6 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">📸</div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-blue-600 mb-1 group-hover:text-blue-700">
                      {loadingCategories ? '読み込み中...' : '現場写真から選択'}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      STGに保存されている写真に黒板を付与してアップロード
                    </p>
                  </div>
                  <div className="text-gray-400 text-2xl group-hover:text-blue-600">
                    {loadingCategories ? '⏳' : '→'}
                  </div>
                </div>
              </button>

              {/* ファイルを選択 */}
              <button
                onClick={() => {
                  console.log('📁 [Modal] Navigating to upload (local)...')
                  router.push(`/upload?site_code=${selectedSite.site_code}&place_code=${selectedSite.place_code || 'dandoli-sample1'}&source=local`)
                  setShowUploadMethodModal(false)
                }}
                className="w-full bg-white border-2 border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">📁</div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-gray-900">
                      ファイルを選択
                    </h2>
                    <p className="text-gray-600 text-sm">
                      ローカルから写真をアップロード（既存機能）
                    </p>
                  </div>
                  <div className="text-gray-400 text-2xl group-hover:text-gray-600">→</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {/* カテゴリ選択モーダル */}
      {showCategoryModal && selectedSite && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowCategoryModal(false)}
          />

          {/* モーダル本体 */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[80vh] bg-white shadow-2xl z-50 rounded-xl p-6 overflow-y-auto">
            {/* ヘッダー */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setShowUploadMethodModal(true)
                }}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← 戻る
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedSite.site_name}
              </h1>
              <p className="text-gray-600 mt-1">写真カテゴリを選択してください</p>
            </div>

            {/* カテゴリ一覧 */}
            {loadingCategories ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">カテゴリを読み込み中...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-gray-600 text-lg">この現場にはまだ写真がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                  // STG category_id → ダンドリワーク setting_id マッピング
                  const categoryIdToSettingId: Record<number, number> = {
                    100: 1, // 施工前
                    200: 2, // 施工中
                    300: 3, // 施工後
                    410: 4, // 現場コメント写真
                    500: 5, // その他
                    600: 6, // 未分類
                  }

                  const settingId = categoryIdToSettingId[category.category_id]

                  // デフォルトカテゴリ名
                  const defaultCategoryNames: Record<number, string> = {
                    100: '施工前',
                    200: '施工中',
                    300: '施工後',
                    410: '現場コメント写真',
                    500: 'その他',
                    600: '未分類',
                  }

                  const categorySetting = placeSettings.find(
                    s => s.setting_type === 'photo_category' && s.setting_id === settingId
                  )
                  const categoryName = categorySetting?.custom_name || defaultCategoryNames[category.category_id] || `カテゴリ${category.category_id}`

                  return (
                    <button
                      key={category.category_id}
                      onClick={() => {
                        console.log('📸 [CategoryModal] Navigating to photos:', category.category_id)
                        router.push(`/sites/${selectedSite.site_code}/categories/${category.category_id}/photos`)
                        setShowCategoryModal(false)
                      }}
                      className="bg-white rounded-xl p-6 hover:shadow-lg transition-all border-2 border-gray-200 hover:border-blue-500 text-left group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-4xl">📁</div>
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                          {category.photo_count}枚
                        </div>
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {categoryName}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        カテゴリID: {category.category_id}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
