// app/api/stg-photos/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteCode = searchParams.get("site_code");
  const categoryId = searchParams.get("category_id");

  console.log('🔍 [GET /api/stg-photos] site_code:', siteCode, 'category_id:', categoryId);

  if (!siteCode) {
    console.error('❌ [GET /api/stg-photos] site_code parameter required');
    return new Response(
      JSON.stringify({ error: "site_code parameter required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const photos = await withSshMysql(async (conn) => {
      console.log('📊 [stg-photos] Querying photos for site_code:', siteCode, 'category_id:', categoryId);

      let query = `
        SELECT
          id AS attachment_id,
          type_key_id AS site_code,
          comment AS remarks,
          real_path,
          org_path,
          mime_type,
          file_size,
          category_id,
          created,
          upload_crew_id
        FROM attachments
        WHERE type_key_id = ?
          AND delete_flg = 0
          AND deleted = 0
          AND mime_type LIKE 'image/%'
          AND type = 0
      `;

      const params: any[] = [parseInt(siteCode, 10)];

      if (categoryId) {
        query += ` AND category_id = ?`;
        params.push(parseInt(categoryId, 10));
      }

      query += ` ORDER BY created DESC`;

      const [rows] = await conn.query<any[]>(query, params);

      console.log('✅ [stg-photos] Found photos:', rows.length);
      return rows;
    });

    return Response.json({ photos });

  } catch (e: any) {
    console.error('❌ [GET /api/stg-photos] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
