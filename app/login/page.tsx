'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.ok) {
        console.log('✅ ログイン成功:', data.user);
        router.push('/sites');
      } else {
        setError(data.message || 'ログインに失敗しました');
      }
    } catch (err: any) {
      setError('通信エラーが発生しました');
      console.error('ログインエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: 'prime' | 'sub') => {
    console.log('🔘 クイックログインボタンクリック:', user);
    if (user === 'prime') {
      setUsername('kozakai@dandoli-works.com');
      setPassword('00000507');
      console.log('✅ 元請けの認証情報をセットしました');
    } else {
      setUsername('dan');
      setPassword('00000507');
      console.log('✅ 協力業者の認証情報をセットしました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-8">
        {/* タイトル */}
        <h1 className="text-xl font-bold text-gray-900 mb-2">電子小黒板アプリ</h1>
        <p className="text-sm text-gray-500 mb-6">ログインしてください</p>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* ログインフォーム */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="kozakai@dandoli-works.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        {/* クイックログイン（テスト用） */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">テスト用クイックログイン</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleQuickLogin('prime')}
              disabled={loading}
              className="py-3 px-4 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              元請け
              <br />
              <span className="text-xs text-gray-500">（小坂井 優）</span>
            </button>
            <button
              onClick={() => handleQuickLogin('sub')}
              disabled={loading}
              className="py-3 px-4 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              協力業者
              <br />
              <span className="text-xs text-gray-500">（小坂井職人）</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
