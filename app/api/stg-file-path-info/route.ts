// app/api/stg-file-path-info/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  try {
    const result = await withSshMysql(async (conn) => {
      // ファイルパス関連のテーブルを探す
      const [tables] = await conn.query<any[]>('SHOW TABLES');

      // 設定テーブルを探す
      const configTables = tables.filter((t: any) => {
        const tableName = Object.values(t)[0] as string;
        return tableName.includes('config') ||
               tableName.includes('setting') ||
               tableName.includes('storage') ||
               tableName.includes('file') ||
               tableName.includes('path');
      });

      // folder_idテーブルを確認
      let folderInfo = null;
      try {
        const [folders] = await conn.query<any[]>(
          'SELECT * FROM folders WHERE id = 184135 LIMIT 1'
        );
        folderInfo = folders[0];
      } catch (e) {
        folderInfo = { error: 'folders table not found or query failed' };
      }

      // attachmentsの1レコードを詳細表示
      const [sample] = await conn.query<any[]>(
        `SELECT
          id,
          real_path,
          org_path,
          folder_id,
          file_size,
          mime_type,
          category_id,
          type_key_id,
          upload_crew_id
        FROM attachments
        WHERE id = 167071549
        LIMIT 1`
      );

      return {
        configTables: configTables.map(t => Object.values(t)[0]),
        folderInfo,
        sampleAttachment: sample[0]
      };
    });

    return Response.json(result);
  } catch (e: any) {
    console.error('❌ [GET /api/stg-file-path-info] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
