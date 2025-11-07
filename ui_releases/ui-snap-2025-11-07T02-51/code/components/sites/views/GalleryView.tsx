'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { placeholders } from '@/lib/ui/placeholders'
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
  latest_photo_url?: string
}

interface GalleryViewProps {
  sites: Site[]
  placeCode: string
}

function getStatusBorderColor(status?: string) {
  if (!status) return 'border-t-gray-300'
  const normalizedStatus = status.trim()
  if (normalizedStatus.includes('見積未提出')) return 'border-t-yellow-400'
  if (normalizedStatus.includes('見積提出済み')) return 'border-t-green-400'
  if (normalizedStatus === '工事中' || normalizedStatus.includes('工事')) return 'border-t-blue-400'
  if (normalizedStatus.includes('完工')) return 'border-t-orange-400'
  if (normalizedStatus.includes('アフター')) return 'border-t-purple-400'
  if (normalizedStatus.includes('中止') || normalizedStatus.includes('他決')) return 'border-t-pink-400'
  return 'border-t-gray-300'
}

function getCardBgColor(status?: string): string {
  if (!status) return 'bg-yellow-50'
  const normalizedStatus = status.trim()
  if (normalizedStatus.includes('見積未提出')) return 'bg-yellow-50'
  if (normalizedStatus.includes('見積提出済み')) return 'bg-green-50'
  if (normalizedStatus === '工事中' || normalizedStatus.includes('工事')) return 'bg-blue-50'
  if (normalizedStatus.includes('完工')) return 'bg-orange-50'
  if (normalizedStatus.includes('アフター')) return 'bg-purple-50'
  if (normalizedStatus.includes('中止') || normalizedStatus.includes('他決')) return 'bg-pink-50'
  return 'bg-yellow-50'
}


function getImageUrl(site: Site): string {
  if (site.latest_photo_url) {
    return `/api/stg-image-proxy?url=${encodeURIComponent(site.latest_photo_url)}`
  }
  const idx = Math.abs(hashCode(site.site_code)) % placeholders.length
  return placeholders[idx]
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash
}

export function GalleryView({ sites, placeCode }: GalleryViewProps) {
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

  return (
    <div
      data-testid="sites-gallery"
      className={cardSize.gridCols}
    >
      {sites.map((site) => (
        <div
          key={site.site_code}
          onClick={() => handleCardClick(site.site_code)}
          className={`${tone.surface} ${cardSize.maxW} group relative cursor-pointer`}
        >
          {/* Hero Image Container - 3:2 aspect ratio */}
          <div className={`relative w-full ${cardSize.gallery.aspect} overflow-hidden border-t-4 ${getStatusBorderColor(site.status)}`}>
            <Image
              src={getImageUrl(site)}
              alt={site.site_name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </div>

          {/* Card Content */}
          <div className={`${tone.cardPad} ${getCardBgColor(site.status)} min-h-[200px] flex flex-col`}>
            <div className="flex-grow">
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

            {/* CTAボタン */}
            <div className="mt-auto pt-2 border-t border-gray-300 flex gap-3">
              <button
                onClick={(e) => handleUpload(e, site.site_code)}
                data-testid="btn-local"
                className={tone.link}
              >
                ローカルから
              </button>
              <button
                onClick={(e) => handleDandori(e, site)}
                data-testid="btn-stg"
                className={tone.link}
              >
                DWから
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
