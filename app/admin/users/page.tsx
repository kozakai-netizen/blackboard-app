'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function UsersAdminPage() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ユーザー一覧を取得
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setError(String(error));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      console.log('🔄 Starting user sync...');

      const response = await fetch('/api/sync/users?place_code=dandoli-sample1', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Sync completed:', data);
      setSyncResult(data);
      loadUsers(); // 再読み込み
    } catch (error) {
      console.error('❌ Sync failed:', error);
      setError(String(error));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setSyncResult(null);

    try {
      console.log('📥 Importing CSV:', file.name);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/users/import-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Import completed:', data);
      setSyncResult(data);
      loadUsers(); // 再読み込み
    } catch (error) {
      console.error('❌ Import failed:', error);
      setError(String(error));
    } finally {
      setIsImporting(false);
      event.target.value = ''; // ファイル選択をリセット
    }
  };

  // 検索フィルター
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← 管理画面に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="mt-2 text-gray-600">
            ダンドリワークAPIからユーザー情報を同期します
          </p>
        </div>

        {/* インポート・同期ボタン */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ユーザー管理</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CSVインポート */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">📥 CSVインポート</h3>
              <p className="text-sm text-gray-600 mb-3">
                ユーザーリストCSVファイルをアップロードしてインポート
              </p>
              <label className={`block px-6 py-3 rounded-lg font-medium text-center cursor-pointer transition-colors ${
                isImporting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
                {isImporting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    インポート中...
                  </span>
                ) : (
                  'CSVファイルを選択'
                )}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>

            {/* API同期（将来用） */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">🔄 API同期（将来実装）</h3>
              <p className="text-sm text-gray-600 mb-3">
                ダンドリワークAPIから最新のユーザー情報を取得
              </p>
              <button
                onClick={handleSync}
                disabled={true}
                className="w-full px-6 py-3 rounded-lg font-medium bg-gray-300 cursor-not-allowed text-gray-500"
              >
                準備中...
              </button>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">エラーが発生しました</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 同期結果表示 */}
        {syncResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-green-800 font-semibold text-lg mb-4">✅ 同期完了</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">取得したユーザー数</p>
                <p className="text-3xl font-bold text-gray-900">{syncResult.stats?.total || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">処理成功</p>
                <p className="text-3xl font-bold text-green-600">{syncResult.stats?.processed || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">エラー</p>
                <p className="text-3xl font-bold text-red-600">{syncResult.stats?.errors || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* ユーザー一覧 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              ユーザー一覧 ({filteredUsers.length}件)
            </h2>
            {/* 検索ボックス */}
            <input
              type="text"
              placeholder="🔍 氏名・メール・会社名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              ユーザーが登録されていません。CSVをインポートしてください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">氏名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">会社名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">権限</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">登録日</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{user.user_id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.company_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.permission || user.level || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
