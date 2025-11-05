'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SetUserPage() {
  const router = useRouter()
  const [users, setUsers] = useState<Array<{ user_id: string; name: string }>>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // 現在のuserIdを取得
        const userId = sessionStorage.getItem('userId')
        setCurrentUserId(userId)

        console.log('🔍 Loading users from STG database...')

        // ユーザー一覧を取得（/api/stg-usersから）
        const res = await fetch('/api/stg-users?limit=100')
        const data = await res.json()

        if (!res.ok) {
          console.error('❌ Error loading users:', data)
          setError(data.error || 'ユーザーの読み込みに失敗しました')
        } else if (data.users) {
          console.log('✅ Users loaded:', data.users.length)
          // id→user_id, nameはそのまま
          const formattedUsers = data.users.map((u: any) => ({
            user_id: String(u.id),
            name: u.name
          }))
          setUsers(formattedUsers)
        }
      } catch (err) {
        console.error('❌ Exception:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleSetUser = () => {
    if (selectedUserId) {
      sessionStorage.setItem('userId', selectedUserId)
      alert(`ユーザーIDを設定しました: ${selectedUserId}`)
      router.push('/sites')
    }
  }

  const handleClearUser = () => {
    sessionStorage.removeItem('userId')
    setCurrentUserId(null)
    alert('ユーザーIDをクリアしました')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4 text-red-600">エラー</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">ユーザー設定</h1>

        {currentUserId && (
          <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm text-gray-600">現在のユーザーID</p>
            <p className="font-mono font-bold">{currentUserId}</p>
            <button
              onClick={handleClearUser}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              クリア
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            ユーザーを選択
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- 選択してください --</option>
            {users.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.name} ({user.user_id})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSetUser}
          disabled={!selectedUserId}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          このユーザーで現場一覧を表示
        </button>
      </div>
    </div>
  )
}
