// app/api/stg-describe/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get("table") || "site_construction_report_details";

  try {
    const columns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query<any[]>(`DESCRIBE ${table}`);
      return rows;
    });

    return Response.json({ table, columns });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
