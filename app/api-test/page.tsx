'use client'

import { useEffect, useState } from 'react'
import { dandoriAPI, SiteInfo } from '@/lib/dandori-api'

export default function ApiTestPage() {
  const [status, setStatus] = useState<string>('読み込み中...')
  const [sites, setSites] = useState<SiteInfo[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      setStatus('API接続中...')
      const siteList = await dandoriAPI.getSites()
      
      if (siteList.length > 0) {
        setStatus(`✅ ${siteList.length}件の現場を取得しました`)
        setSites(siteList)
      } else {
        setStatus('⚠️ 現場が見つかりませんでした')
      }
    } catch (err) {
      setStatus('❌ エラーが発生しました')
      setError(String(err))
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">ダンドリワークAPI接続テスト</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <p className="text-lg">{status}</p>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </div>

      {sites.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">取得した現場一覧</h2>
          <div className="space-y-2">
            {sites.map((site, index) => (
              <div key={index} className="p-4 bg-white border rounded shadow-sm">
                <p className="font-bold">{site.name}</p>
                <p className="text-gray-600">コード: {site.site_code}</p>
                {site.address && <p className="text-sm">{site.address}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
