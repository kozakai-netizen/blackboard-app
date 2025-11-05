// app/api/stg-site-type-categories/route.ts
/**
 * STG現場種類別写真カテゴリ設定API
 *
 * STGデータベースから現場種類（site_type_id）に対応する写真カテゴリ設定を取得
 *
 * クエリパラメータ:
 * - site_code: 現場コード（必須）
 */

import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteCode = searchParams.get("site_code");

  console.log('🔍 [GET /api/stg-site-type-categories] site_code:', siteCode);

  if (!siteCode) {
    console.error('❌ [stg-site-type-categories] site_code parameter required');
    return new Response(
      JSON.stringify({ error: "site_code parameter required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const result = await withSshMysql(async (conn) => {
      // 1. sitesテーブルからsite_type_idを取得
      console.log('📊 [stg-site-type-categories] Fetching site_type for site:', siteCode);

      const [siteRows] = await conn.query<any[]>(
        `
        SELECT
          id as site_code,
          site_type_id,
          name as site_name
        FROM sites
        WHERE id = ?
        LIMIT 1
        `,
        [parseInt(siteCode)]
      );

      if (siteRows.length === 0) {
        throw new Error(`Site not found: ${siteCode}`);
      }

      const site = siteRows[0];
      const siteTypeId = site.site_type_id;

      console.log('📋 [stg-site-type-categories] site_type_id:', siteTypeId);

      // 2. site_type_idに対応するカテゴリ設定を取得
      console.log('📊 [stg-site-type-categories] Fetching categories for site_type_id:', siteTypeId);

      const [categoryRows] = await conn.query<any[]>(
        `
        SELECT
          id as setting_id,
          site_type_id,
          name as category_name,
          default_name,
          sort_no as sort_order
        FROM site_photo_categories
        WHERE site_type_id = ?
        ORDER BY sort_no
        `,
        [siteTypeId]
      );

      console.log('✅ [stg-site-type-categories] Categories found:', categoryRows.length);

      return {
        site_code: siteCode,
        site_type_id: siteTypeId,
        site_name: site.site_name,
        categories: categoryRows
      };
    });

    return Response.json(result);

  } catch (e: any) {
    console.error('❌ [GET /api/stg-site-type-categories] Error:', e);
    return Response.json(
      { error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
