'use client'

import { useState, useEffect, useRef } from 'react'

export default function CompanyLogoPage() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // LocalStorageからロゴを読み込み
  useEffect(() => {
    const logo = localStorage.getItem('companyLogo')
    if (logo) {
      setCompanyLogo(logo)
    }
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // バリデーション
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('ファイルサイズは2MB以下にしてください')
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setCompanyLogo(dataUrl)
      localStorage.setItem('companyLogo', dataUrl)
      setUploading(false)
      alert('ロゴを設定しました')
    }
    reader.onerror = () => {
      setUploading(false)
      alert('ファイルの読み込みに失敗しました')
    }
    reader.readAsDataURL(file)
  }

  const handleLogoDelete = () => {
    if (confirm('会社ロゴを削除しますか？')) {
      setCompanyLogo(null)
      localStorage.removeItem('companyLogo')
      alert('ロゴを削除しました')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {companyLogo && (
              <button
                onClick={() => window.location.href = '/sites'}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                title="現場一覧に戻る"
              >
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  className="h-16 w-16 object-contain"
                />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏢 会社ロゴ設定</h1>
              <p className="mt-1 text-sm text-gray-600">
                アプリ全体で表示される会社ロゴを設定できます
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">会社ロゴ</h2>

          {/* ロゴプレビュー */}
          {companyLogo ? (
            <div className="mb-6">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-gray-200">
                    <img
                      src={companyLogo}
                      alt="Company Logo Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">現在のロゴ</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    このロゴが全ページのヘッダーに表示されます
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                    >
                      {uploading ? 'アップロード中...' : 'ロゴを変更'}
                    </button>
                    <button
                      onClick={handleLogoDelete}
                      disabled={uploading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors text-sm"
                    >
                      ロゴを削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">ロゴが設定されていません</h3>
                <p className="text-sm text-gray-600 mb-6">
                  会社ロゴをアップロードして、アプリ全体に表示しましょう
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {uploading ? 'アップロード中...' : 'ロゴをアップロード'}
                </button>
              </div>
            </div>
          )}

          {/* ファイル入力（非表示） */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />

          {/* 注意事項 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">📋 アップロード要件</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ファイル形式: JPG, PNG, GIF, SVG</li>
              <li>• ファイルサイズ: 2MB以下</li>
              <li>• 推奨サイズ: 正方形（例: 512x512px）</li>
              <li>• 背景透過PNGがおすすめです</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
