export const tone = {
  // 面
  surface: 'rounded-2xl border border-gray-200 bg-white shadow-sm',
  soft: 'rounded-xl border border-gray-200 bg-white',
  // カード・リスト共通パディング
  cardPad: 'px-4 py-3',
  // CTA
  ctaGhost: 'text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50',
  link: 'text-sm text-blue-600 hover:opacity-80 underline underline-offset-2',
  segWrap: 'inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1',
  segBtn: 'px-3 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50 data-[state=on]:bg-blue-50 data-[state=on]:text-blue-700',
  // Chip（色バリアント）
  chip: 'text-[11px] px-2 py-0.5 rounded-full',
  chipNeutral: 'text-gray-700 bg-gray-100',
  chipBlue: 'text-blue-700 bg-blue-50',
  chipGreen: 'text-emerald-700 bg-emerald-50',
  chipAmber: 'text-amber-700 bg-amber-50',
  chipViolet: 'text-violet-700 bg-violet-50',
  chipIndigo: 'text-indigo-700 bg-indigo-50',
  // 入力
  pillInput: 'h-10 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-200'
} as const

// カードサイズ（以前の見た目に近い密度）
export const cardSize = {
  gridCols: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6',
  maxW: 'max-w-[480px]',
  gallery: { aspect: 'aspect-[3/2]' }
} as const
