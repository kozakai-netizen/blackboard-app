'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { fileStore } from '@/lib/fileStore'

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

  const getStatusBadgeColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'

    // trim して正規化
    const normalizedStatus = status.trim()

    // 部分一致も含めて判定
    if (normalizedStatus.includes('見積未提出') || normalizedStatus === '現調中（見積未提出）') {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (normalizedStatus.includes('見積提出済み') || normalizedStatus === '現調中（見積提出済み）') {
      return 'bg-green-100 text-green-800'
    }
    if (normalizedStatus === '工事中' || normalizedStatus.includes('工事')) {
      return 'bg-blue-100 text-blue-800'
    }
    if (normalizedStatus.includes('完工') || normalizedStatus === '完工') {
      return 'bg-orange-100 text-orange-800'
    }
    if (normalizedStatus.includes('アフター') || normalizedStatus === 'アフター') {
      return 'bg-purple-100 text-purple-800'
    }
    if (normalizedStatus.includes('中止') || normalizedStatus.includes('他決')) {
      return 'bg-pink-100 text-pink-800'
    }

    return 'bg-gray-100 text-gray-800'
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
        className={`bg-white rounded-lg shadow hover:shadow-lg transition-all p-5 border-l border-r border-b border-gray-200 cursor-pointer border-t-4 ${getStatusBorderColor(site.status)}`}
      >
        {/* ステータスバッジ */}
        <div className="flex items-center justify-between mb-3 gap-2">
          {site.status && (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(site.status)}`}>
              {site.status}
            </span>
          )}
          {site.site_type && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
              {site.site_type}
            </span>
          )}
        </div>

        {/* 現場名 */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {site.site_name}
        </h3>

        {/* 住所 */}
        {site.address && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-1">
            📍 {site.address}
          </p>
        )}

        {/* 現場管理担当者 */}
        {site.manager_name && (
          <p className="text-sm text-gray-600 mb-3">
            👤 {site.manager_name}
          </p>
        )}

        {/* 更新日 */}
        {site.updated_at && (
          <p className="text-xs text-gray-500 mt-3">
            更新: {new Date(site.updated_at).toLocaleDateString('ja-JP')}
          </p>
        )}
      </div>
    </>
  )
}
