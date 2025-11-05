/**
 * カテゴリIDからカテゴリ名を取得する
 *
 * STGデータベースの category_id に対応する表示名を返す
 */

export const CATEGORY_MAP: Record<number, string> = {
  100: '現場写真',
  101: '工事写真',
  102: '完工写真',
  103: 'アフター写真',
  104: '検査写真',
  105: '報告写真',
  // 必要に応じて追加
}

/**
 * カテゴリIDからカテゴリ名を取得
 *
 * @param categoryId - カテゴリID
 * @returns カテゴリ名（未定義の場合は "カテゴリ{ID}"）
 */
export function getCategoryName(categoryId: number | string): string {
  const id = typeof categoryId === 'string' ? parseInt(categoryId, 10) : categoryId
  return CATEGORY_MAP[id] || `カテゴリ${id}`
}

/**
 * 全カテゴリマップを取得
 */
export function getAllCategories(): Array<{ id: number; name: string }> {
  return Object.entries(CATEGORY_MAP).map(([id, name]) => ({
    id: parseInt(id, 10),
    name
  }))
}
