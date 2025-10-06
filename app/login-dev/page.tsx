'use client'

import { useRouter } from 'next/navigation'

export default function LoginDevPage() {
  const router = useRouter()

  const handleLogin = (userType: 'motoduke' | 'kyoryoku') => {
    // セッションストレージに保存
    sessionStorage.setItem('userType', userType)

    if (userType === 'motoduke') {
      sessionStorage.setItem('userName', '小坂井 優')
      sessionStorage.setItem('companyName', '潟田工務店')
      sessionStorage.setItem('userId', '40824')
    } else {
      sessionStorage.setItem('userName', '杉田 玄白')
      sessionStorage.setItem('companyName', 'ダン基礎')
      sessionStorage.setItem('userId', '40364')
    }

    router.push('/sites')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-8">
          開発用ログイン選択
        </h1>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('motoduke')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            <div className="font-bold">元請としてログイン</div>
            <div className="text-sm mt-1">潟田工務店 - 小坂井 優</div>
          </button>

          <button
            onClick={() => handleLogin('kyoryoku')}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition"
          >
            <div className="font-bold">協力会社としてログイン</div>
            <div className="text-sm mt-1">ダン基礎 - 杉田 玄白</div>
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          ※開発環境専用のログイン選択画面です
        </p>
      </div>
    </div>
  )
}
