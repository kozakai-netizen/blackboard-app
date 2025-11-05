'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Photo {
  attachment_id: number
  site_code: string
  remarks: string
  real_path: string
  org_path: string
  mime_type: string
  file_size: number
  category_id: number
  created: string
  upload_crew_id: string
}

/**
 * 写真一覧画面（サムネイル表示）
 *
 * STG写真のサムネイル一覧を表示
 */
export default function CategoryPhotosPage() {
  const params = useParams()
  const router = useRouter()
  const siteCode = params.site_code as string
  const categoryId = params.category_id as string
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [siteInfo, setSiteInfo] = useState<any>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set())

  console.log('🔍 [CategoryPhotos] site_code:', siteCode, 'category_id:', categoryId)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📊 [CategoryPhotos] Fetching data...')

        // 現場情報と写真一覧を並列取得
        const [siteResponse, photosResponse] = await Promise.all([
          fetch(`/api/sites/${siteCode}`),
          fetch(`/api/stg-photos?site_code=${siteCode}&category_id=${categoryId}`)
        ])

        if (!siteResponse.ok) {
          console.error('❌ [CategoryPhotos] Failed to fetch site info:', siteResponse.status)
        } else {
          const siteData = await siteResponse.json()
          console.log('✅ [CategoryPhotos] Site info:', siteData.site)
          setSiteInfo(siteData.site)
        }

        if (!photosResponse.ok) {
          console.error('❌ [CategoryPhotos] Failed to fetch photos:', photosResponse.status)
        } else {
          const photosData = await photosResponse.json()
          console.log('✅ [CategoryPhotos] Photos:', photosData.photos?.length)
          setPhotos(photosData.photos || [])
        }
      } catch (error) {
        console.error('❌ [CategoryPhotos] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [siteCode, categoryId])

  const togglePhotoSelection = (attachmentId: number) => {
    const newSelected = new Set(selectedPhotos)
    if (newSelected.has(attachmentId)) {
      newSelected.delete(attachmentId)
    } else {
      newSelected.add(attachmentId)
    }
    setSelectedPhotos(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.attachment_id)))
    }
  }

  const handleNext = () => {
    if (selectedPhotos.size === 0) {
      alert('写真を選択してください')
      return
    }

    // 選択した写真IDをクエリパラメータで渡して、アップロード画面に遷移
    const photoIds = Array.from(selectedPhotos).join(',')
    router.push(`/upload?site_code=${siteCode}&place_code=${siteInfo?.place_code || 'dandoli-sample1'}&source=stg&photo_ids=${photoIds}&category_id=${categoryId}&debug=1`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">写真を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/sites')}
            className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
          >
            ← 現場一覧に戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {siteInfo?.site_name || '現場名取得中...'}
          </h1>
          <p className="text-gray-600 mt-1">
            写真を選択してください（{selectedPhotos.size}/{photos.length}枚選択中）
          </p>
        </div>

        {/* アクションバー */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {selectedPhotos.size === photos.length ? '選択を解除' : 'すべて選択'}
          </button>
          <button
            onClick={handleNext}
            disabled={selectedPhotos.size === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            次へ（{selectedPhotos.size}枚）
          </button>
        </div>

        {/* 写真一覧 */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-gray-600 text-lg">このカテゴリにはまだ写真がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <button
                key={photo.attachment_id}
                onClick={() => togglePhotoSelection(photo.attachment_id)}
                className={`relative aspect-square rounded-xl overflow-hidden border-4 transition-all ${
                  selectedPhotos.has(photo.attachment_id)
                    ? 'border-blue-500 shadow-lg scale-95'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* サムネイル画像 */}
                <img
                  src={`/api/stg-image-proxy?real_path=${encodeURIComponent(photo.real_path)}`}
                  alt={`写真 ${photo.attachment_id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    // 画像読み込みエラー時に代替画像を表示
                    const target = e.target as HTMLImageElement
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E画像なし%3C/text%3E%3C/svg%3E'
                    target.onerror = null // 無限ループ防止
                  }}
                />

                {/* 選択チェックマーク */}
                {selectedPhotos.has(photo.attachment_id) && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
                    ✓
                  </div>
                )}

                {/* 備考オーバーレイ */}
                {photo.remarks && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 line-clamp-2">
                    {photo.remarks}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
