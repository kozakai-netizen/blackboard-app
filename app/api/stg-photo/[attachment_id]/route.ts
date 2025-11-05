// app/api/stg-photo/[attachment_id]/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(
  request: Request,
  { params }: { params: { attachment_id: string } }
) {
  console.log('🔍 [GET /api/stg-photo/[attachment_id]] attachment_id:', params.attachment_id);

  try {
    const attachmentId = parseInt(params.attachment_id, 10);

    if (isNaN(attachmentId)) {
      console.error('❌ [GET /api/stg-photo/[attachment_id]] Invalid attachment_id');
      return new Response(
        JSON.stringify({ error: "Invalid attachment_id" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const photo = await withSshMysql(async (conn) => {
      console.log('📊 [stg-photo] Querying photo for attachment_id:', attachmentId);

      const [rows] = await conn.query<any[]>(
        `
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
        WHERE id = ?
          AND delete_flg = 0
          AND deleted = 0
          AND mime_type LIKE 'image/%'
          AND type = 0
        LIMIT 1
        `,
        [attachmentId]
      );

      if (rows.length === 0) {
        console.warn('⚠️ [stg-photo] Photo not found:', attachmentId);
        return null;
      }

      console.log('✅ [stg-photo] Photo found:', rows[0].real_path);
      return rows[0];
    });

    if (!photo) {
      return new Response(
        JSON.stringify({ error: "Photo not found" }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    return Response.json({ photo });

  } catch (e: any) {
    console.error('❌ [GET /api/stg-photo/[attachment_id]] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
