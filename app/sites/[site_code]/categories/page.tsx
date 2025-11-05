'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getCategoryName } from '@/lib/categoryNames'

interface Category {
  category_id: number
  photo_count: number
}

/**
 * カテゴリ選択画面
 *
 * STG写真のカテゴリ一覧を表示し、選択したカテゴリの写真一覧画面に遷移
 */
export default function SiteCategoriesPage() {
  const params = useParams()
  const router = useRouter()
  const siteCode = params.site_code as string
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [siteInfo, setSiteInfo] = useState<any>(null)

  console.log('🔍 [SiteCategories] site_code:', siteCode)

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📊 [SiteCategories] Fetching data...')

        // 現場情報とカテゴリ一覧を並列取得
        const [siteResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/sites/${siteCode}`),
          fetch(`/api/stg-photo-categories?site_code=${siteCode}`)
        ])

        if (!siteResponse.ok) {
          console.error('❌ [SiteCategories] Failed to fetch site info:', siteResponse.status)
        } else {
          const siteData = await siteResponse.json()
          console.log('✅ [SiteCategories] Site info:', siteData.site)
          setSiteInfo(siteData.site)
        }

        if (!categoriesResponse.ok) {
          console.error('❌ [SiteCategories] Failed to fetch categories:', categoriesResponse.status)
        } else {
          const categoriesData = await categoriesResponse.json()
          console.log('✅ [SiteCategories] Categories:', categoriesData.categories)
          setCategories(categoriesData.categories)
        }
      } catch (error) {
        console.error('❌ [SiteCategories] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [siteCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">カテゴリを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
          <p className="text-gray-600 mt-1">写真カテゴリを選択してください</p>
        </div>

        {/* カテゴリ一覧 */}
        {categories.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-gray-600 text-lg">この現場にはまだ写真がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <button
                key={category.category_id}
                onClick={() => {
                  console.log('📸 [SiteCategories] Navigating to photos:', category.category_id)
                  router.push(`/sites/${siteCode}/categories/${category.category_id}/photos`)
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
                  {getCategoryName(category.category_id)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  カテゴリID: {category.category_id}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
