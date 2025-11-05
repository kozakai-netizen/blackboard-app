'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'motoduke' | 'kyoryoku' | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectType = (type: 'motoduke' | 'kyoryoku') => {
    setSelectedType(type)
    setError('')
    // 元請の場合はデフォルト値を設定
    if (type === 'motoduke') {
      setUsername('kozakai@dandoli-works.com')
      setPassword('00000507')
    } else {
      setUsername('')
      setPassword('')
    }
  }

  const handleLogin = async () => {
    if (!username || !password) {
      setError('ユーザー名とパスワードを入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // usersテーブルからユーザー情報を取得
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, userType: selectedType })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました')
        setIsLoading(false)
        return
      }

      // セッションストレージに保存
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userType', selectedType!)
        sessionStorage.setItem('userId', data.user.user_id)
        sessionStorage.setItem('userName', data.user.name)
      }

      // 現場一覧へ遷移
      router.push('/sites')
    } catch (err) {
      setError('ログイン処理でエラーが発生しました')
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedType(null)
    setUsername('')
    setPassword('')
    setError('')
  }

  // 会社ロゴをLocalStorageから読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('companyLogo')
      if (savedLogo) {
        setCompanyLogo(savedLogo)
      }
    }
  }, [])

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // ロゴアップロード
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        alert('ファイルサイズは2MB以下にしてください')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setCompanyLogo(dataUrl)
        localStorage.setItem('companyLogo', dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setCompanyLogo(null)
    localStorage.removeItem('companyLogo')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* ハンバーガーメニュー（ロゴと統合） */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="メニューを開く"
                >
                  {companyLogo ? (
                    <div className="relative group">
                      <img
                        src={companyLogo}
                        alt="会社ロゴ"
                        className="h-16 w-16 object-contain"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveLogo()
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </div>
                  )}
                </button>

                {/* ドロップダウンメニュー */}
                {showMenu && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          setShowMenu(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-3"
                      >
                        <span>🖼️</span>
                        <span>ロゴをアップロード</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">電子小黒板システム</h1>
                <p className="mt-1 text-sm text-gray-600">
                  ダンドリワーク連携 - 現場写真一括アップロード
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto px-4 py-16">

        {/* クイックアクセス / ログインフォーム */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {!selectedType ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                🚀 クイックアクセス
              </h2>
              <p className="text-center text-gray-600 mb-8">
                アカウント種別を選択してください
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 元請ログイン */}
                <button
                  onClick={() => handleSelectType('motoduke')}
                  className="group relative bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <div className="text-2xl font-bold mb-2">元請でログイン</div>
                    <div className="text-sm opacity-90">
                      担当現場を閲覧できます
                    </div>
                    <div className="text-xs opacity-75 mt-2">
                      （ステータス: 追客中・契約中・着工中）
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 text-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>

                {/* 協力会社ログイン */}
                <button
                  onClick={() => handleSelectType('kyoryoku')}
                  className="group relative bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">👷</div>
                    <div className="text-2xl font-bold mb-2">協力会社でログイン</div>
                    <div className="text-sm opacity-90">
                      参加現場のみ閲覧できます
                    </div>
                    <div className="text-xs opacity-75 mt-2">
                      （招待された現場のみ表示）
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 text-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ログインフォーム */}
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={handleBack}
                    className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                  >
                    ← 戻る
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedType === 'motoduke' ? '🏢 元請ログイン' : '👷 協力会社ログイン'}
                  </h2>
                  <div className="w-16"></div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ユーザー名（メールアドレス）
                    </label>
                    <input
                      type="email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="example@dandoli-works.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      パスワード
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="パスワードを入力"
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-lg font-medium text-white transition-all ${
                      isLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : selectedType === 'motoduke'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isLoading ? 'ログイン中...' : 'ログイン'}
                  </button>
                </div>

                {selectedType === 'motoduke' && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                    💡 元請アカウントの場合、デフォルトで入力されています
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* 機能説明 */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">✨ 主な機能</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <div className="font-semibold text-gray-900">写真一括アップロード</div>
                <div className="text-gray-600">複数枚の写真を一度に登録</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <div className="font-semibold text-gray-900">黒板テンプレート</div>
                <div className="text-gray-600">カスタマイズ可能な電子小黒板</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="font-semibold text-gray-900">国交省準拠</div>
                <div className="text-gray-600">SHA-256改ざん検知対応</div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 ダンドリワーク連携 電子小黒板システム</p>
        </div>
      </div>
    </div>
  )
}
