'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewMode } from '@/lib/ui/viewModes';
import { tone } from '@/lib/ui/theme';

export default function Toolbar({
  mode, onChangeMode, onlyMine, onToggleMine, q, onChangeQ, companyLogo, showMenu, onToggleMenu, onLogoClick, onOpenAdvSearch
}: {
  mode: ViewMode; onChangeMode: (v: ViewMode)=>void;
  onlyMine: boolean; onToggleMine: (v: boolean)=>void;
  q: string; onChangeQ: (v: string)=>void;
  companyLogo: string | null;
  showMenu: boolean;
  onToggleMenu: (show: boolean) => void;
  onLogoClick: () => void;
  onOpenAdvSearch: () => void;
}) {
  return (
    <div className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-3">
        <div className={`${tone.surface} px-4 py-3`}>
          {/* 1行：企業ロゴ + 検索 + 自分の現場 + 詳細検索 + ビュー切り替え */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 shrink-0 relative">
              {/* 企業ロゴ（クリックでメニュー） */}
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

            <input
              className={`${tone.pillInput} max-w-[360px]`}
              placeholder="現場名 / コード / 住所…"
              defaultValue={q}
              onKeyDown={(e)=>{ if (e.key==='Enter') onChangeQ((e.target as HTMLInputElement).value); }}
              data-testid="sites-search"
            />

            <label className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 shrink-0">
              <input type="checkbox" className="h-3.5 w-3.5" checked={onlyMine}
                     onChange={(e)=> onToggleMine(e.target.checked)}
                     data-testid="sites-only-mine" />
              自分の現場
            </label>

            <button type="button" className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 shrink-0"
              data-testid="btn-adv-search"
              onClick={onOpenAdvSearch}>
              詳細検索
            </button>

            <div className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1" data-testid="view-mode-switcher">
              <ToggleGroup type="single" value={mode} onValueChange={(v)=> v && onChangeMode(v as ViewMode)}>
                <ToggleGroupItem className="px-3 h-8 rounded text-xs font-medium text-gray-600 hover:bg-white data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm" value="gallery">ギャラリー</ToggleGroupItem>
                <ToggleGroupItem className="px-3 h-8 rounded text-xs font-medium text-gray-600 hover:bg-white data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm" value="kanban">カンバン</ToggleGroupItem>
                <ToggleGroupItem className="px-3 h-8 rounded text-xs font-medium text-gray-600 hover:bg-white data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm" value="grid">カード</ToggleGroupItem>
                <ToggleGroupItem className="px-3 h-8 rounded text-xs font-medium text-gray-600 hover:bg-white data-[state=on]:bg-white data-[state=on]:text-blue-600 data-[state=on]:shadow-sm" value="list">リスト</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
