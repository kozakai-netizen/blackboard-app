// UI FIXPACK V3 — All view styles must import from here only.
export const tone = {
  surface:  'rounded-2xl border border-gray-200 bg-white shadow-sm',
  soft:     'rounded-xl border border-gray-200 bg-white',
  cardPad:  'px-4 py-3',

  link:     'text-sm text-blue-600 hover:opacity-80 underline underline-offset-2',

  // chips
  chip:        'text-[11px] px-2 py-0.5 rounded-full',
  chipNeutral: 'text-gray-700 bg-gray-100',
  chipBlue:    'text-blue-700 bg-blue-50',
  chipGreen:   'text-emerald-700 bg-emerald-50',
  chipAmber:   'text-amber-700 bg-amber-50',
  chipViolet:  'text-violet-700 bg-violet-50',
  chipIndigo:  'text-indigo-700 bg-indigo-50',

  // toolbar
  pillInput: 'h-10 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full',
  ctaGhost:  'text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50'
} as const;

export const cardSize = {
  // ✅ 3列固定（XL以上）・少し小さめに
  gridCols: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-5',
  maxW:     'max-w-[440px]',      // ← 以前より少し小さめ（大き過ぎ対策）
  gallery:  { aspect: 'aspect-[4/3]' } // ← 横長過ぎを抑制（3:2→4:3）
} as const;
