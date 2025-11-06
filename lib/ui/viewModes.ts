// View mode types and constants

export type ViewMode = 'grid' | 'gallery' | 'kanban' | 'list'

export interface ViewModeMetadata {
  id: ViewMode
  name: string
  description: string
  icon: string
  perPage: number
  shortcut: string
}

export const VIEW_MODES: Record<ViewMode, ViewModeMetadata> = {
  grid: {
    id: 'grid',
    name: 'カード',
    description: 'カード形式で現場を表示',
    icon: '▦',
    perPage: 12,
    shortcut: 'G'
  },
  gallery: {
    id: 'gallery',
    name: 'ギャラリー',
    description: '写真主役の大きいカード表示',
    icon: '🖼',
    perPage: 9,
    shortcut: 'A'
  },
  kanban: {
    id: 'kanban',
    name: 'カンバン',
    description: 'ステータス列で進捗を可視化',
    icon: '📊',
    perPage: 120,
    shortcut: 'K'
  },
  list: {
    id: 'list',
    name: 'リスト',
    description: 'テーブル形式で現場を表示',
    icon: '☰',
    perPage: 40,
    shortcut: 'L'
  }
}

export const DEFAULT_VIEW_MODE: ViewMode = 'gallery'

export const VIEW_META = {
  grid:    { label: 'カード',     perPage: 12 },
  gallery: { label: 'ギャラリー', perPage: 9  },
  kanban:  { label: 'カンバン',   perPage: 120 },
  list:    { label: 'リスト',     perPage: 40 },
} as const
