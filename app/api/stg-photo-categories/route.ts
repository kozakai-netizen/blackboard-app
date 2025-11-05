// app/api/stg-photo-categories/route.ts
import mysql from 'mysql2/promise';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteCode = searchParams.get("site_code");

  console.log('🔍 [GET /api/stg-photo-categories] site_code:', siteCode);

  if (!siteCode) {
    console.error('❌ [GET /api/stg-photo-categories] site_code parameter required');
    return new Response(
      JSON.stringify({ error: "site_code parameter required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  let conn;
  try {
    // 既存のSSHトンネル（localhost:13306）を使用
    console.log('📊 [stg-photo-categories] Connecting to DB via tunnel...');
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    console.log('📊 [stg-photo-categories] Querying categories for site:', siteCode);

    const [rows] = await conn.query<any[]>(
      `
      SELECT
        category_id,
        COUNT(*) as photo_count
      FROM attachments
      WHERE type_key_id = ?
        AND type = 0
        AND delete_flg = 0
        AND deleted = 0
        AND mime_type LIKE 'image/%'
      GROUP BY category_id
      ORDER BY category_id
      `,
      [parseInt(siteCode)]
    );

    console.log('✅ [stg-photo-categories] Found categories:', rows.length);

    return Response.json({
      site_code: siteCode,
      count: rows.length,
      categories: rows
    });

  } catch (e: any) {
    console.error('❌ [GET /api/stg-photo-categories] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}
