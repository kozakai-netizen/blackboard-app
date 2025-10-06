'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewSitePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    siteName: '',
    siteLocation: '',
    customerName: '',
    constructionPeriod: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const sites = JSON.parse(localStorage.getItem('sites') || '[]')
    const newSite = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
      siteCode: null,
      syncedAt: null
    }
    
    sites.push(newSite)
    localStorage.setItem('sites', JSON.stringify(sites))
    
    alert('現場を登録しました')
    router.push('/sites')
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">新規現場登録</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-2">現場名 *</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.siteName}
            onChange={(e) => setFormData({...formData, siteName: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block mb-2">現場住所 *</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.siteLocation}
            onChange={(e) => setFormData({...formData, siteLocation: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block mb-2">施主名 *</label>
          <input
            type="text"
            required
            className="w-full border rounded px-3 py-2"
            value={formData.customerName}
            onChange={(e) => setFormData({...formData, customerName: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block mb-2">工期</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="例: 2024/01/01 - 2024/03/31"
            value={formData.constructionPeriod}
            onChange={(e) => setFormData({...formData, constructionPeriod: e.target.value})}
          />
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            登録
          </button>
          <Link
            href="/sites"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  )
}

