// app/api/stg-categories/route.ts
/**
 * STGカテゴリマッピングAPI
 *
 * STGデータベースのカテゴリマスタから category_id → category_name のマッピングを返す
 *
 * 【注意】
 * STGカテゴリIDは固定値（100=施工前, 200=施工中, 300=施工後, etc.）
 * これはSTGシステム側で定義されたマスタデータです。
 *
 * TODO: 将来的にはm_site_photo_categoryテーブルから動的に取得することが望ましい
 */

export async function GET() {
  try {
    console.log('🔍 [GET /api/stg-categories] Returning STG category mapping');

    // STGカテゴリIDマスタ（固定値）
    // これはSTGシステム側で定義されているカテゴリIDとname
    const categoryNames: Record<number, string> = {
      100: '施工前写真',
      200: '施工中写真',
      300: '施工後写真',
      410: '現場コメント写真',
      500: 'その他',
      600: '未分類'
    };

    const categories = Object.entries(categoryNames).map(([id, name]) => ({
      category_id: Number(id),
      category_name: name
    }));

    const categoryMap = categoryNames;

    console.log('✅ [stg-categories] Returned', categories.length, 'categories');

    return Response.json({
      categories,
      categoryMap
    });

  } catch (e: any) {
    console.error('❌ [GET /api/stg-categories] Error:', e);
    return Response.json(
      { error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
