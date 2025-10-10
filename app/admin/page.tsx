'use client'

import { useEffect, useState } from 'react'

export default function AdminPage() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)

  useEffect(() => {
    const logo = localStorage.getItem('companyLogo')
    if (logo) {
      setCompanyLogo(logo)
    }
  }, [])

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
              <h1 className="text-2xl font-bold text-gray-900">⚙️ 管理画面</h1>
              <p className="mt-1 text-sm text-gray-600">
                テンプレート・ユーザー・現場参加者を管理できます
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 管理メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/templates"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">📋</div>
            <h3 className="font-semibold text-lg">テンプレート管理</h3>
            <p className="text-sm text-gray-600 mt-1">黒板テンプレートの作成・編集</p>
          </a>

          <a
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">👥</div>
            <h3 className="font-semibold text-lg">ユーザー管理</h3>
            <p className="text-sm text-gray-600 mt-1">ユーザーのインポート・編集</p>
          </a>

          <a
            href="/admin/site-members"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">🏗️</div>
            <h3 className="font-semibold text-lg">現場参加者管理</h3>
            <p className="text-sm text-gray-600 mt-1">現場参加者CSVインポート</p>
          </a>

          <a
            href="/admin/company-logo"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl mb-2">🏢</div>
            <h3 className="font-semibold text-lg">会社ロゴ設定</h3>
            <p className="text-sm text-gray-600 mt-1">会社ロゴのアップロード・削除</p>
          </a>
        </div>
      </div>
    </div>
  )
}
