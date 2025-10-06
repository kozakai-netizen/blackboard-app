'use client'

import { useState, useEffect } from 'react'

export default function TestPhotoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [siteCode, setSiteCode] = useState('')
  const [category, setCategory] = useState('施工前')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [availableSites, setAvailableSites] = useState<any[]>([])

  useEffect(() => {
    // 実際の現場コードを取得
    console.log('🔵 Fetching sites for test page...');
    fetch('/api/dandori/sites?place_code=dandoli-sample1')
      .then(res => res.json())
      .then(data => {
        console.log('🔵 Test page - sites response:', data);
        if (data.data && Array.isArray(data.data)) {
          // URLから現場IDを抽出
          const sitesWithCode = data.data.map((site: any) => {
            let code = site.site_code;
            if (!code && site.url) {
              const match = site.url.match(/\/sites\/(\d+)/);
              if (match) {
                code = match[1];
              }
            }
            return { ...site, site_code: code };
          }).filter((s: any) => s.site_code);

          console.log('🔵 Sites with extracted codes:', sitesWithCode.length);
          setAvailableSites(sitesWithCode.slice(0, 10)) // 最初の10件
          if (sitesWithCode.length > 0) {
            setSiteCode(sitesWithCode[0].site_code) // 最初の現場コードをセット
          }
        }
      })
      .catch(err => console.error('❌ Failed to fetch sites:', err))
  }, [])

  const handleUpload = async () => {
    if (!file || !siteCode) {
      alert('現場コードとファイルを選択してください')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('site_code', siteCode)
    formData.append('category_name', category)
    formData.append('data[files][]', file)

    try {
      const response = await fetch('/api/dandori/site-photos', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      setResult(data)
      console.log('Upload result:', data)
    } catch (error) {
      console.error('Upload error:', error)
      setResult({ error: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">写真アップロードテスト</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">現場選択</label>
          <select
            value={siteCode}
            onChange={(e) => setSiteCode(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">現場を選択してください</option>
            {availableSites.map((site) => (
              <option key={site.site_code} value={site.site_code}>
                {site.site_code} - {site.name || site.site_name || '現場名未設定'}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            選択中の現場コード: {siteCode}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">カテゴリ</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option>施工前</option>
            <option>施工中</option>
            <option>施工後</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">写真ファイル</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || !siteCode || uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {uploading ? 'アップロード中...' : 'アップロード'}
        </button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-bold mb-2">結果:</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
