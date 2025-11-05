// app/api/stg-tables/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  try {
    const tables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query<any[]>("SHOW TABLES");
      return rows;
    });

    return Response.json(tables);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
