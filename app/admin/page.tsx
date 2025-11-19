'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminPage() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [showNavDrawer, setShowNavDrawer] = useState(false)

  useEffect(() => {
    const logo = localStorage.getItem('companyLogo')
    if (logo) {
      setCompanyLogo(logo)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションドロワー */}
      {showNavDrawer && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowNavDrawer(false)}
          />

          {/* ドロワー本体 */}
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-2xl z-50 transform transition-transform">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h2 className="text-xl font-bold text-gray-900">メニュー</h2>
                <button
                  onClick={() => setShowNavDrawer(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* メニューリンク */}
              <nav className="space-y-2">
                <Link
                  href="/sites"
                  className="block px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                  onClick={() => setShowNavDrawer(false)}
                >
                  現場一覧
                </Link>
                <Link
                  href="/admin/templates"
                  className="block px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                  onClick={() => setShowNavDrawer(false)}
                >
                  黒板テンプレート設定
                </Link>
                <Link
                  href="/admin"
                  className="block px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                  onClick={() => setShowNavDrawer(false)}
                >
                  管理画面
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
                >
                  ログアウト
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* ヘッダー - 現場一覧と統一 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {companyLogo && (
              <button
                onClick={() => setShowNavDrawer(true)}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                title="メニューを開く"
              >
                <img
                  src={companyLogo}
                  alt="Company Logo"
                  className="h-16 w-16 object-contain"
                />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
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
            <h3 className="font-semibold text-lg">テンプレート管理</h3>
            <p className="text-sm text-gray-600 mt-1">黒板テンプレートの作成・編集</p>
          </a>

          <a
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">ユーザー管理</h3>
            <p className="text-sm text-gray-600 mt-1">ユーザーのインポート・編集</p>
          </a>

          <a
            href="/admin/site-members"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">現場参加者管理</h3>
            <p className="text-sm text-gray-600 mt-1">現場参加者CSVインポート</p>
          </a>

          <a
            href="/admin/company-logo"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg">会社ロゴ設定</h3>
            <p className="text-sm text-gray-600 mt-1">会社ロゴのアップロード・削除</p>
          </a>
        </div>
      </div>
    </div>
  )
}
