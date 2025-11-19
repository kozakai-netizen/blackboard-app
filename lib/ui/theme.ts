// UI FIXPACK V4 — 統一デザインシステム
export const tone = {
  // 統一カードデザイン
  surface:  'rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow',
  soft:     'rounded-xl border border-gray-200 bg-white',
  cardPad:  'py-3 px-4',

  // 統一タイトル・テキストサイズ
  cardTitle: 'text-base font-semibold',
  cardSubtitle: 'text-sm text-gray-600',

  link: 'text-sm text-blue-600 hover:opacity-80 underline underline-offset-2',

  // chips - ギャラリー表示のトンマナに統一
  chip:        'text-xs px-2.5 py-1 rounded-md font-medium',
  chipNeutral: 'text-gray-700 bg-gray-100 border border-gray-200',
  chipBlue:    'text-blue-700 bg-blue-50 border border-blue-200',
  chipGreen:   'text-emerald-700 bg-emerald-50 border border-emerald-200',
  chipAmber:   'text-amber-700 bg-amber-50 border border-amber-200',
  chipViolet:  'text-violet-700 bg-violet-50 border border-violet-200',
  chipIndigo:  'text-indigo-700 bg-indigo-50 border border-indigo-200',
  chipYellow:  'text-yellow-700 bg-yellow-50 border border-yellow-200',
  chipOrange:  'text-orange-700 bg-orange-50 border border-orange-200',
  chipPurple:  'text-purple-700 bg-purple-50 border border-purple-200',
  chipPink:    'text-pink-700 bg-pink-50 border border-pink-200',

  // 統一ボタンスタイル
  buttonPrimary: 'px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors',
  buttonSecondary: 'px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors',

  // toolbar
  pillInput: 'h-10 rounded-full border border-gray-300 px-4 focus:outline-none focus:ring-2 focus:ring-blue-200 w-full',
  ctaGhost:  'text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50'
} as const;

export const cardSize = {
  // ✅ 3列固定（XL以上）・グリッドで自動幅調整
  gridCols: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-5',
  maxW:     '', // 削除：カードをグリッド幅いっぱいに広げる
  gallery:  { aspect: 'aspect-[4/3]' }
} as const;
