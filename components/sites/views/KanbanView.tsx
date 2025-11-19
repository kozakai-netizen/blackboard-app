'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { tone, cardSize } from '@/lib/ui/theme'
import { SiteChip } from '@/components/ui/SiteChip'
import { statusVariant, typeVariant } from '@/lib/sites/chipStyle'

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

interface KanbanViewProps {
  sites: Site[]
  placeCode: string
}

const STATUS_LANES = [
  { id: '現調中（見積未提出）', label: '現調中（見積未提出）', color: 'bg-yellow-50' },
  { id: '現調中（見積提出済み）', label: '現調中（見積提出済み）', color: 'bg-green-50' },
  { id: '工事中', label: '工事中', color: 'bg-blue-50' },
  { id: '完工', label: '完工', color: 'bg-orange-50' },
  { id: 'アフター', label: 'アフター', color: 'bg-purple-50' },
  { id: '中止・他決', label: '中止・他決', color: 'bg-pink-50' }
]

function getStatusLane(status?: string): string {
  if (!status) return '現調中（見積未提出）'
  const normalizedStatus = status.trim()
  if (normalizedStatus.includes('見積未提出')) return '現調中（見積未提出）'
  if (normalizedStatus.includes('見積提出済み')) return '現調中（見積提出済み）'
  if (normalizedStatus === '工事中' || normalizedStatus.includes('工事')) return '工事中'
  if (normalizedStatus.includes('完工')) return '完工'
  if (normalizedStatus.includes('アフター')) return 'アフター'
  if (normalizedStatus.includes('中止') || normalizedStatus.includes('他決')) return '中止・他決'
  return '現調中（見積未提出）'
}


export function KanbanView({ sites, placeCode }: KanbanViewProps) {
  const router = useRouter()

  const handleCardClick = (siteCode: string) => {
    router.push(`/sites/${siteCode}`)
  }

  const handleUpload = (e: React.MouseEvent, siteCode: string) => {
    e.stopPropagation()
    router.push(`/sites/${siteCode}?tab=upload`)
  }

  const handleDandori = (e: React.MouseEvent, site: Site) => {
    e.stopPropagation()
    const url = `https://d.dandori.work/${site.place_code}/${site.site_code}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const sitesByStatus = STATUS_LANES.reduce((acc, lane) => {
    acc[lane.id] = sites.filter(site => getStatusLane(site.status) === lane.id)
    return acc
  }, {} as Record<string, Site[]>)

  const headerRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  const handleScroll = (source: 'header' | 'cards') => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft
    if (source === 'header' && cardsRef.current) {
      cardsRef.current.scrollLeft = scrollLeft
    } else if (source === 'cards' && headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* ヘッダー行 - 横スクロール */}
      <div
        ref={headerRef}
        className="flex gap-4 overflow-x-auto overflow-y-hidden -mx-6 px-6 flex-shrink-0"
        style={{ scrollbarWidth: 'thin' }}
        onScroll={handleScroll('header')}
      >
        {STATUS_LANES.map((lane) => {
          const laneSites = sitesByStatus[lane.id] || []

          // 明示的にクラス名を指定（Tailwind JIT用）
          let bgColorClass = ''
          if (lane.id === '現調中（見積未提出）') bgColorClass = 'bg-yellow-50'
          else if (lane.id === '現調中（見積提出済み）') bgColorClass = 'bg-green-50'
          else if (lane.id === '工事中') bgColorClass = 'bg-blue-50'
          else if (lane.id === '完工') bgColorClass = 'bg-orange-50'
          else if (lane.id === 'アフター') bgColorClass = 'bg-purple-50'
          else if (lane.id === '中止・他決') bgColorClass = 'bg-pink-50'

          return (
            <div
              key={`header-${lane.id}`}
              className={`flex-shrink-0 min-w-[300px] w-[32rem] sticky top-[calc(68px)] z-10 px-3 py-2 rounded-xl border border-gray-200 ${bgColorClass}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[13px] text-gray-900">{lane.label}</h3>
                <span className={tone.chip}>
                  {laneSites.length}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* カードコンテナ行 - 横スクロール（ヘッダーと同期） */}
      <div
        ref={cardsRef}
        data-testid="sites-kanban"
        className="flex gap-4 overflow-x-auto overflow-y-hidden -mx-6 px-6 flex-1"
        style={{ scrollbarWidth: 'thin' }}
        onScroll={handleScroll('cards')}
      >
        {STATUS_LANES.map((lane) => {
          const laneSites = sitesByStatus[lane.id] || []
          return (
            <div
              key={lane.id}
              className="flex-shrink-0 min-w-[300px] w-[32rem] h-full"
            >
              {/* Cards Container - スクロール可能 */}
              <div className="bg-gray-50 rounded-b-lg p-3 overflow-y-auto h-full space-y-3">
              {laneSites.map((site) => (
                <div
                  key={site.site_code}
                  onClick={() => handleCardClick(site.site_code)}
                  className={`${tone.surface} ${tone.cardPad} cursor-pointer flex flex-col`}
                >
                  <div className="flex-1">
                    {/* 現場名 */}
                    <h4
                      data-testid="site-name"
                      className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight"
                    >
                      {site.site_name}
                    </h4>

                    {/* チップ（種類とステータス） */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {site.site_type && <SiteChip text={site.site_type} variant={typeVariant(site.site_type)} testId="site-type" />}
                      {site.status && <SiteChip text={site.status} variant={statusVariant(site.status)} testId="site-status" />}
                    </div>

                    {/* 住所 */}
                    {site.address && (
                      <p
                        data-testid="site-address"
                        className="text-sm text-gray-600 mt-2 line-clamp-1"
                      >
                        {site.address}
                      </p>
                    )}

                    {/* 更新日 */}
                    {site.updated_at && (
                      <p
                        data-testid="site-updated-at"
                        className="text-sm text-gray-500 mt-1"
                      >
                        更新: {new Date(site.updated_at).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>

                  {/* CTAボタン - 右下配置 */}
                  <div className="mt-auto pt-3 flex gap-2 justify-end">
                    <button
                      onClick={(e) => handleUpload(e, site.site_code)}
                      data-testid="btn-local"
                      className={tone.buttonSecondary}
                    >
                      ローカル
                    </button>
                    <button
                      onClick={(e) => handleDandori(e, site)}
                      data-testid="btn-stg"
                      className={tone.buttonPrimary}
                    >
                      DW
                    </button>
                  </div>
                </div>
              ))}

              {laneSites.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  該当する現場がありません
                </div>
              )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
