'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getTemplateById, updateTemplate } from '@/lib/templates'
import type { BlackboardData, BlackboardDesignSettings, Template } from '@/types'
import DraggableBlackboard from '@/components/DraggableBlackboard'

// 利用可能な項目
const AVAILABLE_FIELDS = [
  { id: '工事名', label: '工事名', required: true },
  { id: '工種', label: '工種', required: false },
  { id: '種別', label: '種別', required: false },
  { id: '細別', label: '細別', required: false },
  { id: '撮影日', label: '撮影日', required: true },
  { id: '施工者', label: '施工者', required: true },
  { id: '撮影場所', label: '撮影場所', required: false },
  { id: '測点位置', label: '測点・位置', required: false },
  { id: '立会者', label: '立会者', required: false },
  { id: '備考', label: '備考', required: false },
]

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 基本情報
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // 選択された項目
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  // デフォルト値
  const [defaultValues, setDefaultValues] = useState<Partial<BlackboardData>>({})

  // デザイン設定
  const [designSettings, setDesignSettings] = useState<BlackboardDesignSettings>({
    style: 'black',
    position: { x: 10, y: 50 },
    width: 80,
    height: 20,
    fontSize: 'standard',
    bgColor: '#000000',
    textColor: '#FFFFFF',
    opacity: 85,
  })

  // テンプレートデータを読み込み
  useEffect(() => {
    loadTemplate()
  }, [templateId])

  const loadTemplate = async () => {
    try {
      setLoading(true)
      const template = await getTemplateById(templateId)

      if (!template) {
        alert('テンプレートが見つかりませんでした')
        router.push('/admin/templates')
        return
      }

      // データをセット
      setName(template.name)
      setDescription(template.description || '')
      setIsDefault(template.isDefault || false)
      setSelectedFields(template.fields)
      setDefaultValues(template.defaultValues)
      setDesignSettings(template.designSettings)
    } catch (error) {
      console.error('❌ Failed to load template:', error)
      alert('テンプレートの読み込みに失敗しました')
      router.push('/admin/templates')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldToggle = (fieldId: string) => {
    const field = AVAILABLE_FIELDS.find((f) => f.id === fieldId)
    if (field?.required) return // 必須項目はトグル不可

    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldId))
      // デフォルト値も削除
      const newDefaults = { ...defaultValues }
      delete newDefaults[fieldId as keyof BlackboardData]
      setDefaultValues(newDefaults)
    } else {
      setSelectedFields([...selectedFields, fieldId])
    }
  }

  const handleDefaultValueChange = (fieldId: string, value: string) => {
    setDefaultValues({
      ...defaultValues,
      [fieldId]: value,
    })
  }

  const handleStyleChange = (style: 'black' | 'green') => {
    setDesignSettings({
      ...designSettings,
      style,
      bgColor: style === 'black' ? '#000000' : '#1a5f3f',
    })
  }

  const handlePositionChange = (position: { x: number; y: number }) => {
    setDesignSettings({
      ...designSettings,
      position,
    })
  }

  const handleSizeChange = (width: number) => {
    setDesignSettings({
      ...designSettings,
      width,
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('テンプレート名を入力してください')
      return
    }

    try {
      setSaving(true)
      await updateTemplate(templateId, {
        name: name.trim(),
        description: description.trim(),
        fields: selectedFields,
        defaultValues,
        designSettings,
        isDefault,
      })

      alert('テンプレートを更新しました！')
      router.push('/admin/templates')
    } catch (error) {
      console.error('❌ Failed to update template:', error)
      alert('テンプレートの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/templates')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </button>
              <h1 className="text-2xl font-bold">✏️ テンプレート編集</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin/templates')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左側：設定エリア */}
          <div className="lg:col-span-3 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📝 基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    テンプレート名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例：土工事セット"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">説明</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例：土工事でよく使う設定"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">
                    ⭐ このテンプレートをデフォルトに設定する
                  </label>
                </div>
              </div>
            </div>

            {/* 記載項目選択 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">✅ 記載項目選択</h2>
              <p className="text-sm text-gray-600 mb-4">
                黒板に表示する項目を選択してください（必須項目は変更できません）
              </p>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_FIELDS.map((field) => (
                  <label
                    key={field.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-lg transition cursor-pointer ${
                      selectedFields.includes(field.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${field.required ? 'opacity-75' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      disabled={field.required}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="font-medium">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-xs text-red-500">必須</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* デフォルト値設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📊 デフォルト値設定</h2>
              <p className="text-sm text-gray-600 mb-4">
                よく使う値を設定しておくと、アップロード時に自動入力されます
              </p>
              <div className="space-y-4">
                {selectedFields
                  .filter((f) => f !== '工事名' && f !== '撮影日')
                  .map((fieldId) => (
                    <div key={fieldId}>
                      <label className="block text-sm font-medium mb-2">
                        {AVAILABLE_FIELDS.find((f) => f.id === fieldId)?.label}
                      </label>
                      <input
                        type="text"
                        value={(defaultValues[fieldId as keyof BlackboardData] as string) || ''}
                        onChange={(e) => handleDefaultValueChange(fieldId, e.target.value)}
                        placeholder={`例：${
                          fieldId === '工種'
                            ? '土工'
                            : fieldId === '種別'
                            ? '掘削'
                            : fieldId === '施工者'
                            ? '潟田工務店'
                            : ''
                        }`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* デザイン設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">🎨 黒板デザイン設定</h2>

              {/* 黒板スタイル */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">黒板スタイル</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleStyleChange('black')}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      designSettings.style === 'black'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="w-full h-16 bg-black rounded flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-bold">黒板（黒）</span>
                    </div>
                    <div className="text-sm text-center">
                      {designSettings.style === 'black' && '✓ 選択中'}
                    </div>
                  </button>
                  <button
                    onClick={() => handleStyleChange('green')}
                    className={`flex-1 p-4 rounded-lg border-2 transition ${
                      designSettings.style === 'green'
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-full h-16 rounded flex items-center justify-center mb-2"
                      style={{ backgroundColor: '#1a5f3f' }}
                    >
                      <span className="text-white text-sm font-bold">黒板（緑）</span>
                    </div>
                    <div className="text-sm text-center">
                      {designSettings.style === 'green' && '✓ 選択中'}
                    </div>
                  </button>
                </div>
              </div>

              {/* フォントサイズ */}
              <div>
                <label className="block text-sm font-medium mb-3">フォントサイズ</label>
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      setDesignSettings({ ...designSettings, fontSize: 'standard' })
                    }
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                      designSettings.fontSize === 'standard'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">標準</span>
                  </button>
                  <button
                    onClick={() =>
                      setDesignSettings({ ...designSettings, fontSize: 'large' })
                    }
                    className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                      designSettings.fontSize === 'large'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-lg">大</span>
                  </button>
                </div>
              </div>

              {/* 黒板位置の説明 */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">💡</span>
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">黒板の位置について</p>
                    <p>
                      黒板の位置は、写真アップロード時にドラッグ&ドロップで自由に調整できます。
                      デフォルトは左中央（10%, 50%）に配置されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：プレビュー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">👁️ プレビュー</h2>

              {/* ドラッグ可能な黒板プレビュー */}
              <DraggableBlackboard
                selectedFields={selectedFields}
                defaultValues={defaultValues}
                designSettings={designSettings}
                availableFields={AVAILABLE_FIELDS}
                onPositionChange={handlePositionChange}
                onSizeChange={handleSizeChange}
              />

              {/* 選択中の項目数 */}
              <div className="mt-4 text-sm text-gray-600">
                <p>選択中の項目: {selectedFields.length}個</p>
                <p className="mt-1">
                  黒板スタイル:{' '}
                  <span className="font-medium">
                    {designSettings.style === 'black' ? '黒板（黒）' : '黒板（緑）'}
                  </span>
                </p>
                <p className="mt-1">
                  フォント:{' '}
                  <span className="font-medium">
                    {designSettings.fontSize === 'standard' ? '標準' : '大'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
