'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { fileStore } from '@/lib/fileStore'
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

interface SiteCardProps {
  site: Site
  placeCode: string
  onCardClick?: (site: Site) => void
}

export function SiteCard({ site, placeCode, onCardClick }: SiteCardProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCardClick = () => {
    console.log('🔍 [SiteCard] Card clicked:', site.site_code)
    if (onCardClick) {
      onCardClick(site)
    } else {
      // フォールバック: 従来のページ遷移
      router.push(`/sites/${site.site_code}`)
    }
  }

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/sites/${site.site_code}?tab=upload`)
  }

  const handleDandori = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `https://d.dandori.work/${site.place_code}/${site.site_code}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 50)
    if (files.length > 0) {
      fileStore.setFiles(files, site.site_code, placeCode)
      router.push(`/upload?site_code=${site.site_code}&place_code=${placeCode}`)
    }
    e.target.value = ''
  }

  const getStatusBorderColor = (status?: string) => {
    if (!status) return 'border-t-gray-300'

    // trim して正規化
    const normalizedStatus = status.trim()

    // 部分一致も含めて判定
    if (normalizedStatus.includes('見積未提出') || normalizedStatus === '現調中（見積未提出）') {
      return 'border-t-yellow-400'
    }
    if (normalizedStatus.includes('見積提出済み') || normalizedStatus === '現調中（見積提出済み）') {
      return 'border-t-green-400'
    }
    if (normalizedStatus === '工事中' || normalizedStatus.includes('工事')) {
      return 'border-t-blue-400'
    }
    if (normalizedStatus.includes('完工') || normalizedStatus === '完工') {
      return 'border-t-orange-400'
    }
    if (normalizedStatus.includes('アフター') || normalizedStatus === 'アフター') {
      return 'border-t-purple-400'
    }
    if (normalizedStatus.includes('中止') || normalizedStatus.includes('他決')) {
      return 'border-t-pink-400'
    }

    return 'border-t-gray-300'
  }


  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={handleCardClick}
        data-testid="site-card"
        className={`${tone.surface} ${tone.cardPad} ${cardSize.maxW} cursor-pointer border-t-4 ${getStatusBorderColor(site.status)} flex flex-col`}
      >
        <div className="flex-1">
          {/* 現場名 */}
          <h3
            data-testid="site-name"
            className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight"
          >
            {site.site_name}
          </h3>

          {/* チップ（種類とステータス） */}
          <div className="flex flex-wrap gap-1 mb-2">
            {site.site_type && <SiteChip text={site.site_type} variant={typeVariant(site.site_type)} testId="site-type" />}
            {site.status && <SiteChip text={site.status} variant={statusVariant(site.status)} testId="site-status" />}
          </div>

          {/* 住所 */}
          {site.address && (
            <p
              data-testid="site-address"
              className="text-xs text-gray-600 mt-2 line-clamp-1"
            >
              {site.address}
            </p>
          )}

          {/* 更新日 */}
          {site.updated_at && (
            <p
              data-testid="site-updated-at"
              className="text-xs text-gray-500 mt-1"
            >
              更新: {new Date(site.updated_at).toLocaleDateString('ja-JP')}
            </p>
          )}
        </div>

        {/* CTAボタン - 右下配置 */}
        <div className="mt-auto pt-3 flex gap-2 justify-end">
          <button
            onClick={handleUpload}
            data-testid="btn-local"
            className={tone.buttonSecondary}
          >
            ローカル
          </button>
          <button
            onClick={handleDandori}
            data-testid="btn-stg"
            className={tone.buttonPrimary}
          >
            DW
          </button>
        </div>
      </div>
    </>
  )
}
