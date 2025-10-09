'use client'

import { useEffect, useState } from 'react'
import { getAllTemplates } from '@/lib/templates'
import type { Template } from '@/types'

export default function AdminPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getAllTemplates()
      setTemplates(data)
      console.log('✅ Templates loaded:', data)
    } catch (err) {
      console.error('❌ Failed to load templates:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">⚙️ 管理画面</h1>

        {/* デバッグ情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 動作確認</h2>

          {loading && (
            <div className="text-blue-600">読み込み中...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
              <p className="font-semibold">エラー発生:</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="font-semibold text-green-700">
                  Supabase接続成功！
                </span>
              </div>

              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="font-semibold mb-2">取得したテンプレート数:</p>
                <p className="text-3xl font-bold text-green-700">
                  {templates.length} 件
                </p>
              </div>

              {/* テンプレート一覧 */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">テンプレート一覧:</h3>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {template.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-500">
                              使用回数: {template.usageCount}回
                            </span>
                            {template.isDefault && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                                デフォルト
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 詳細情報（折りたたみ） */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                          詳細を表示
                        </summary>
                        <div className="mt-3 p-3 bg-white rounded border text-xs">
                          <pre className="overflow-auto">
                            {JSON.stringify(template, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* クイックアクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🚀 クイックアクション</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => window.location.href = '/admin/templates'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-8 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl text-left transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">📝</div>
                <div className="flex-1">
                  <div className="font-bold text-xl mb-1">テンプレート管理</div>
                  <div className="text-sm opacity-90">
                    黒板テンプレートの作成・編集・削除・複製
                  </div>
                </div>
                <div className="text-2xl opacity-50">→</div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/admin/users'}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white py-6 px-8 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl text-left transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">👥</div>
                <div className="flex-1">
                  <div className="font-bold text-xl mb-1">ユーザー管理</div>
                  <div className="text-sm opacity-90">
                    ダンドリワークAPIからユーザー情報を同期
                  </div>
                </div>
                <div className="text-2xl opacity-50">→</div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/sites'}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white py-6 px-8 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl text-left transform hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="text-4xl">🏗️</div>
                <div className="flex-1">
                  <div className="font-bold text-xl mb-1">現場一覧に戻る</div>
                  <div className="text-sm opacity-90">
                    写真アップロード・現場管理
                  </div>
                </div>
                <div className="text-2xl opacity-50">→</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
