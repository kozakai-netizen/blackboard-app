'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SiteMembersAdminPage() {
  const _router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)

  useEffect(() => {
    const logo = localStorage.getItem('companyLogo')
    if (logo) {
      setCompanyLogo(logo)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('ファイルを選択してください')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/site-members/import-csv', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ imported: data.imported, errors: data.errors })
        console.log('✅ Import successful:', data)
      } else {
        setError(data.error || 'インポートに失敗しました')
      }
    } catch (err) {
      console.error('❌ Import error:', err)
      setError('インポート中にエラーが発生しました')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - 現場一覧と統一 */}
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
              <h1 className="text-2xl font-bold text-gray-900">🏗️ 現場参加者管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                現場参加者CSVインポートができます
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">CSVインポート</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                現場参加者CSVファイル
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  選択: {file.name}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {importing ? 'インポート中...' : 'インポート開始'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-4 text-red-800">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ インポート完了</h3>
              <div className="text-sm text-green-700">
                <p>インポート成功: {result.imported} 件</p>
                {result.errors > 0 && (
                  <p className="text-red-600">エラー: {result.errors} 件</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📝 CSVフォーマット</h3>
          <p className="text-sm text-blue-700 mb-2">
            ダンドリワークからエクスポートした現場参加者CSVをそのままインポートできます。
          </p>
          <div className="text-sm text-blue-700">
            <p className="font-mono">
              現場ID,現場名,会社ID,会社名,ユーザーID,ユーザー名,参加レベル
            </p>
            <p className="mt-2 text-xs">
              参加レベル: 1=管理担当者, 2=サブ管理担当者, 3=参加ユーザー
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
