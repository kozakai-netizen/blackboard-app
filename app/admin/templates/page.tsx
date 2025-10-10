'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAllTemplates, deleteTemplate, duplicateTemplate } from '@/lib/templates'
import type { Template } from '@/types'

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
    const logo = localStorage.getItem('companyLogo')
    if (logo) {
      setCompanyLogo(logo)
    }
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getAllTemplates()
      setTemplates(data)
    } catch (error) {
      console.error('❌ Failed to load templates:', error)
      alert('テンプレートの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    try {
      await deleteTemplate(id)
      alert('削除しました')
      loadTemplates()
    } catch (error) {
      console.error('❌ Failed to delete template:', error)
      alert('削除に失敗しました')
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const newTemplate = await duplicateTemplate(id)
      alert(`「${newTemplate.name}」を作成しました`)
      loadTemplates()
    } catch (error) {
      console.error('❌ Failed to duplicate template:', error)
      alert('複製に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - 現場一覧と統一 */}
      <div className="bg-white border-b sticky top-0 z-10">
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
              <h1 className="text-2xl font-bold text-gray-900">📝 テンプレート管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                黒板テンプレートの作成・編集・削除ができます
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">総テンプレート数</div>
            <div className="text-3xl font-bold text-blue-600">{templates.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">よく使われるテンプレート</div>
            <div className="text-lg font-semibold text-gray-900 truncate">
              {templates.length > 0 ? templates[0].name : '-'}
            </div>
            <div className="text-sm text-gray-500">
              {templates.length > 0 ? `${templates[0].usageCount}回使用` : ''}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">デフォルトテンプレート</div>
            <div className="text-lg font-semibold text-gray-900 truncate">
              {templates.find(t => t.isDefault)?.name || '-'}
            </div>
          </div>
        </div>

        {/* 新規作成ボタン */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/templates/new')}
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-base flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新規テンプレート作成
          </button>
        </div>

        {/* テンプレート一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden ${
                template.isDefault ? 'border-4 border-blue-500' : ''
              }`}
            >
              {/* 黒板プレビュー部分 */}
              <div className="p-6 bg-gray-50 relative h-80 flex items-center justify-center">
                {/* 黒板まるまる表示 */}
                <div
                  className="text-white shadow-xl w-full"
                  style={{
                    backgroundColor: template.designSettings.bgColor,
                    fontSize: '1rem',
                    border: '4px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4), 0 6px 16px rgba(0, 0, 0, 0.6)',
                    borderRadius: '4px',
                  }}
                >
                  <div className="p-4">
                    <div className="space-y-2">
                      {/* 工事名 - 全幅 */}
                      <div
                        className="flex items-center border-2 border-white/50 rounded"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        }}
                      >
                        <div
                          className="py-2 px-3 font-bold text-sm"
                          style={{
                            minWidth: '80px',
                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            borderRight: '2px solid rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          工事名
                        </div>
                        <div className="py-2 px-3 flex-1 text-sm font-medium">
                          ○○マンション新築工事
                        </div>
                      </div>

                      {/* その他の項目 - 2列グリッド */}
                      <div className="grid grid-cols-2 gap-2">
                        {template.fields
                          .filter((f) => f !== '工事名')
                          .map((fieldId) => (
                            <div
                              key={fieldId}
                              className="flex items-center border border-white/50 rounded text-xs"
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                              }}
                            >
                              <div
                                className="py-1.5 px-2 font-bold whitespace-nowrap text-center"
                                style={{
                                  width: '65px',
                                  flexShrink: 0,
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  borderRight: '1px solid rgba(255, 255, 255, 0.5)',
                                }}
                              >
                                {fieldId}
                              </div>
                              <div className="py-1.5 px-2 flex-1 truncate">
                                {template.defaultValues[fieldId as keyof typeof template.defaultValues] || '－'}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* デフォルトバッジ */}
                {template.isDefault && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    デフォルト
                  </div>
                )}
              </div>

              {/* 情報部分 */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description || '説明なし'}
                </p>

                {/* 統計 */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>📊 {template.usageCount}回使用</span>
                  {template.lastUsed && (
                    <span className="truncate">
                      最終: {new Date(template.lastUsed).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/templates/${template.id}/edit`)}
                    className="flex-1 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition text-sm font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.id)}
                    className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
                    title="複製"
                  >
                    📋
                  </button>
                  {!template.isDefault && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className={`px-3 py-2 rounded transition ${
                        deleteConfirm === template.id
                          ? 'bg-red-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                      title={deleteConfirm === template.id ? '本当に削除？' : '削除'}
                    >
                      {deleteConfirm === template.id ? '✓' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 新規作成カード */}
          <button
            onClick={() => router.push('/admin/templates/new')}
            className="bg-white rounded-lg shadow border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors min-h-[320px] flex flex-col items-center justify-center gap-3 p-6"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">➕</span>
            </div>
            <span className="font-medium text-gray-700">新規テンプレート作成</span>
            <span className="text-sm text-gray-500">クリックして作成開始</span>
          </button>
        </div>

        {/* 空状態 */}
        {templates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">テンプレートがありません</h3>
            <p className="text-gray-600 mb-6">
              新しいテンプレートを作成して、写真アップロードを効率化しましょう
            </p>
            <button
              onClick={() => router.push('/admin/templates/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              ➕ 最初のテンプレートを作成
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
