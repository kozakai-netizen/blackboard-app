'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ViewMode } from '@/lib/ui/viewModes'
import { tone } from '@/lib/ui/theme'

export default function Toolbar({
  mode,
  onChangeMode,
  onlyMine,
  onToggleMine,
  q,
  onChangeQ,
  onOpenAdvSearch,
  companyLogo,
  showMenu,
  onToggleMenu,
  onLogoClick
}: {
  mode: ViewMode
  onChangeMode: (v: ViewMode) => void
  onlyMine: boolean
  onToggleMine: (v: boolean) => void
  q: string
  onChangeQ: (v: string) => void
  onOpenAdvSearch: () => void
  companyLogo: string | null
  showMenu: boolean
  onToggleMenu: (show: boolean) => void
  onLogoClick: () => void
}) {
  const [searchValue, setSearchValue] = useState(q)

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChangeQ(searchValue)
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-3">
        <div className={`${tone.surface} px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-3`}>
          {/* 左：会社ロゴ＋タイトル */}
          <div className="flex items-center gap-2 min-w-[120px] relative">
            {/* 会社ロゴ（クリックでメニュー） */}
            {companyLogo ? (
              <div className="relative">
                <img
                  src={companyLogo}
                  alt="会社ロゴ"
                  onClick={() => onToggleMenu(!showMenu)}
                  className="w-10 h-10 object-contain cursor-pointer hover:opacity-80 transition-opacity rounded"
                />
                {/* ドロップダウンメニュー */}
                {showMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <Link
                      href="/admin"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      管理画面
                    </Link>
                    <Link
                      href="/admin/templates"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      テンプレート管理
                    </Link>
                    <Link
                      href="/admin/users"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                    >
                      ユーザー管理
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogoClick}
                className="w-10 h-10 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <span className="text-xl text-gray-400">+</span>
              </button>
            )}
            <Link href="/sites?quick=1">
              <span className="font-semibold text-[15px] tracking-wide">現場検索</span>
            </Link>
          </div>

          {/* 中央：検索（丸Pill・幅は最大640px） */}
          <div className="flex-1 min-w-[220px] flex justify-center">
            <input
              className={`${tone.pillInput} w-full max-w-[640px]`}
              placeholder="現場名 / コード / 住所 / 管理者名…（ / でフォーカス ）"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="sites-search"
            />
          </div>

          {/* 右：セグメント（ギャラリー / カンバン / カード / リスト） */}
          <div className={`${tone.segWrap} ml-auto`}>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && onChangeMode(v as ViewMode)}
            >
              <div className="flex gap-1" data-testid="view-mode-switcher">
                <ToggleGroupItem className={tone.segBtn} value="gallery">
                  ギャラリー
                </ToggleGroupItem>
                <ToggleGroupItem className={tone.segBtn} value="kanban">
                  カンバン
                </ToggleGroupItem>
                <ToggleGroupItem className={tone.segBtn} value="grid">
                  カード
                </ToggleGroupItem>
                <ToggleGroupItem className={tone.segBtn} value="list">
                  リスト
                </ToggleGroupItem>
              </div>
            </ToggleGroup>
          </div>

          {/* 自分の現場のみ（ピル）＋ 詳細検索 */}
          <div className="flex items-center gap-2">
            <label className={`${tone.segWrap} py-1.5 cursor-pointer`}>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={onlyMine}
                onChange={(e) => onToggleMine(e.target.checked)}
                data-testid="sites-only-mine"
              />
              <span className="text-sm text-gray-700 pr-1.5">自分の現場のみ</span>
            </label>
            <button
              type="button"
              className={tone.ctaGhost}
              data-testid="btn-adv-search"
              onClick={onOpenAdvSearch}
            >
              詳細検索
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
