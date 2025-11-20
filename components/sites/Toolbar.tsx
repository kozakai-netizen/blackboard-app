'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewMode } from '@/lib/ui/viewModes';
import { tone } from '@/lib/ui/theme';

export default function Toolbar({
  mode, onChangeMode, onlyMine, onToggleMine, q, onChangeQ, showOnlyMineToggle = true, sessionUser, showAdvancedSearch, setShowAdvancedSearch
}: {
  mode: ViewMode; onChangeMode: (v: ViewMode)=>void;
  onlyMine: boolean; onToggleMine: (v: boolean)=>void;
  q: string; onChangeQ: (v: string)=>void;
  showOnlyMineToggle?: boolean; // 元請けのみ表示（デフォルト: true）
  sessionUser?: any; // ログイン情報
  showAdvancedSearch?: boolean;
  setShowAdvancedSearch?: (v: boolean) => void;
}) {
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  // LocalStorageからロゴ読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLogo = localStorage.getItem('companyLogo');
      if (savedLogo) {
        setCompanyLogo(savedLogo);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <>
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

      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            {/* 左側：ロゴ + タイトル + サブテキスト + 詳細検索ボタン */}
            <div className="flex flex-col gap-3">
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
                  <h1 className="text-2xl font-bold text-gray-900">現場一覧</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    現場を選択して電子小黒板を設定します
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium w-fit"
                data-testid="btn-adv-search"
                onClick={()=> setShowAdvancedSearch?.(true)}
              >
                詳細検索
              </button>
            </div>

            {/* 右側：元請けバッジ */}
            {sessionUser && (
              <div className="relative group">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-700">
                    {sessionUser.userRole === 'prime' ? '元請け' : sessionUser.userRole === 'sub' ? '協力業者' : '不明'}
                  </span>
                </div>
                {/* ツールチップ */}
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="text-xs text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">User ID:</span>
                      <span>{sessionUser.userId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Role:</span>
                      {sessionUser.userRole === 'prime' && (
                        <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">元請け</span>
                      )}
                      {sessionUser.userRole === 'sub' && (
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">協力業者</span>
                      )}
                      {sessionUser.userRole === 'unknown' && (
                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">不明</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
