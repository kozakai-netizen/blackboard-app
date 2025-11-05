// app/api/stg-find-attachment/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const realPath = searchParams.get("real_path");

  if (!realPath) {
    return new Response(
      JSON.stringify({ error: "real_path parameter required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    const result = await withSshMysql(async (conn) => {
      // attachmentsテーブルから該当レコードを検索
      const [attachments] = await conn.query<any[]>(
        `SELECT * FROM attachments WHERE real_path = ? LIMIT 1`,
        [realPath]
      );

      if (attachments.length === 0) {
        return { found: false, message: "Attachment not found" };
      }

      const attachment = attachments[0];

      // attachment_idを参照しているテーブルを調査
      // 1. site_construction_report_details
      const [constructionReports] = await conn.query<any[]>(
        `SELECT * FROM site_construction_report_details WHERE attachment_id = ? LIMIT 5`,
        [attachment.id]
      );

      return {
        found: true,
        attachment,
        references: {
          site_construction_report_details: constructionReports
        }
      };
    });

    return Response.json(result);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
