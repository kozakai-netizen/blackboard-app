// app/page.tsx
'use client';

import Link from 'next/link';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-800">
            📋 電子小黒板
          </h1>
          <p className="text-xl text-gray-600">
            ダンドリワーク 一括登録
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            主な機能
          </h2>

          <div className="grid gap-4 text-left">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="font-semibold text-gray-800">最大50枚一括処理</h3>
                <p className="text-sm text-gray-600">
                  複数の写真に一度に黒板を付与できます
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="font-semibold text-gray-800">国交省準拠</h3>
                <p className="text-sm text-gray-600">
                  SHA-256ハッシュによる改ざん検知機能付き
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="font-semibold text-gray-800">簡単操作</h3>
                <p className="text-sm text-gray-600">
                  まず現場を選択してから、写真をアップロードします
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/sites"
            className="block w-full py-4 px-8 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 font-bold text-xl transition-colors
                       shadow-lg hover:shadow-xl"
          >
            はじめる →
          </Link>
        </div>

        <div className="text-sm text-gray-500">
          <p>株式会社ダンドリワーク</p>
          <p className="mt-1">© 2025 Dandori Work Inc.</p>
        </div>
      </div>
    </div>
  );
}
