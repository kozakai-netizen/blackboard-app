'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewMode } from '@/lib/ui/viewModes';
import { tone } from '@/lib/ui/theme';

export default function Toolbar({
  mode, onChangeMode, onlyMine, onToggleMine, q, onChangeQ
}: {
  mode: ViewMode; onChangeMode: (v: ViewMode)=>void;
  onlyMine: boolean; onToggleMine: (v: boolean)=>void;
  q: string; onChangeQ: (v: string)=>void;
}) {
  return (
    <div className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-3">
        <div className={`${tone.surface} px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-3`}>
          <Link href="/sites?quick=1" className="flex items-center gap-2 min-w-[120px]">
            <Image src="/logo.svg" alt="Dandori Works" width={28} height={28} className="shrink-0" />
            <span className="font-semibold text-[15px] tracking-wide">現場検索</span>
          </Link>

          <div className="flex-1 min-w-[220px] flex justify-center">
            <input
              className={`${tone.pillInput} max-w-[640px]`}
              placeholder="現場名 / コード / 住所 / 管理者名…（ / でフォーカス ）"
              defaultValue={q}
              onKeyDown={(e)=>{ if (e.key==='Enter') onChangeQ((e.target as HTMLInputElement).value); }}
              data-testid="sites-search"
            />
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 ml-auto" data-testid="view-mode-switcher">
            <ToggleGroup type="single" value={mode} onValueChange={(v)=> v && onChangeMode(v as ViewMode)}>
              <ToggleGroupItem className="px-3 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700" value="gallery">ギャラリー</ToggleGroupItem>
              <ToggleGroupItem className="px-3 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700" value="kanban">カンバン</ToggleGroupItem>
              <ToggleGroupItem className="px-3 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700" value="grid">カード</ToggleGroupItem>
              <ToggleGroupItem className="px-3 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700" value="list">リスト</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white">
              <input type="checkbox" className="h-4 w-4" checked={onlyMine}
                     onChange={(e)=> onToggleMine(e.target.checked)}
                     data-testid="sites-only-mine" />
              自分の現場のみ
            </label>
            <button type="button" className={tone.ctaGhost}
              data-testid="btn-adv-search"
              onClick={()=> document.dispatchEvent(new CustomEvent('open-adv-search'))}>
              詳細検索
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
