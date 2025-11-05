// app/api/stg-photos-sample/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteCode = searchParams.get("site_code");
  const limit = searchParams.get("limit") || "50";

  try {
    const photos = await withSshMysql(async (conn) => {
      let sql = `
        SELECT
          a.id AS attachment_id,
          a.type_key_id AS site_code,
          a.comment AS remarks,
          a.real_path,
          a.org_path,
          a.mime_type,
          a.file_size,
          a.category_id,
          a.created,
          a.upload_crew_id
        FROM attachments a
        WHERE a.delete_flg = 0
          AND a.deleted = 0
          AND a.mime_type LIKE 'image/%'
          AND a.type = 0
          AND a.category_id = 100
      `;

      if (siteCode) {
        sql += ` AND a.type_key_id = ${parseInt(siteCode)}`;
      }

      sql += ` ORDER BY a.created DESC LIMIT ${parseInt(limit)}`;

      const [rows] = await conn.query<any[]>(sql);
      return rows;
    });

    return Response.json({ site_code: siteCode, count: photos.length, photos });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
