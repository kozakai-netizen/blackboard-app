// app/api/stg-check-image-data/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get("attachment_id");

  try {
    const result = await withSshMysql(async (conn) => {
      // まずテーブル構造を確認
      const [columns] = await conn.query<any[]>('DESCRIBE attachments');

      // 実際のレコードを1件取得（全カラム）
      const [rows] = await conn.query<any[]>(
        `SELECT * FROM attachments WHERE id = ? LIMIT 1`,
        [attachmentId || 167071549]
      );

      return {
        columns: columns.map((col: any) => ({
          field: col.Field,
          type: col.Type,
          null: col.Null,
          key: col.Key,
        })),
        sample: rows[0] ? {
          id: rows[0].id,
          real_path: rows[0].real_path,
          org_path: rows[0].org_path,
          mime_type: rows[0].mime_type,
          file_size: rows[0].file_size,
          // 全カラム名を表示
          allColumns: Object.keys(rows[0]),
          // バイナリデータがあるか確認
          hasData: rows[0].data ? `Yes (${rows[0].data.length} bytes)` : 'No',
          hasImageData: rows[0].image_data ? `Yes (${rows[0].image_data.length} bytes)` : 'No',
          hasBinary: rows[0].binary ? `Yes (${rows[0].binary.length} bytes)` : 'No',
          hasContent: rows[0].content ? `Yes (${rows[0].content.length} bytes)` : 'No',
        } : null
      };
    });

    return Response.json(result);
  } catch (e: any) {
    console.error('❌ [GET /api/stg-check-image-data] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
