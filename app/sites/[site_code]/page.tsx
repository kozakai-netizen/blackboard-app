'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * アップロード方法選択画面
 *
 * 現場選択後に表示される画面
 * - 現場写真から選択（STG写真使用）
 * - ファイルを選択（ローカルファイルアップロード）
 */
export default function SiteUploadMethodPage() {
  const params = useParams()
  const router = useRouter()
  const siteCode = params.site_code as string
  const [siteInfo, setSiteInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  console.log('🔍 [SiteUploadMethod] site_code:', siteCode)

  useEffect(() => {
    // 現場情報取得
    const fetchSiteInfo = async () => {
      try {
        console.log('📊 [SiteUploadMethod] Fetching site info...')
        const response = await fetch(`/api/sites/${siteCode}`)

        if (!response.ok) {
          console.error('❌ [SiteUploadMethod] Failed to fetch site info:', response.status)
          return
        }

        const data = await response.json()
        console.log('✅ [SiteUploadMethod] Site info:', data.site)
        setSiteInfo(data.site)
      } catch (error) {
        console.error('❌ [SiteUploadMethod] Error fetching site info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSiteInfo()
  }, [siteCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">現場情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
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
          <p className="text-gray-600 mt-1">アップロード方法を選択してください</p>
        </div>

        {/* 選択肢カード */}
        <div className="space-y-4">
          {/* 現場写真から選択 */}
          <button
            onClick={() => {
              console.log('📸 [SiteUploadMethod] Navigating to categories...')
              router.push(`/sites/${siteCode}/categories`)
            }}
            className="w-full bg-white border-2 border-blue-500 rounded-xl p-6 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="text-5xl">📸</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-blue-600 mb-1 group-hover:text-blue-700">
                  現場写真から選択
                </h2>
                <p className="text-gray-600 text-sm">
                  STGに保存されている写真に黒板を付与してアップロード
                </p>
              </div>
              <div className="text-gray-400 text-2xl group-hover:text-blue-600">→</div>
            </div>
          </button>

          {/* ファイルを選択 */}
          <button
            onClick={() => {
              console.log('📁 [SiteUploadMethod] Navigating to upload (local)...')
              router.push(`/upload?site_code=${siteCode}&place_code=${siteInfo?.place_code || 'dandoli-sample1'}&source=local`)
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
    </div>
  )
}
