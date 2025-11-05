// app/api/stg-search-tables/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "photo";

  try {
    const tables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query<any[]>("SHOW TABLES");
      return rows.filter((row: any) => {
        const tableName = Object.values(row)[0] as string;
        return tableName.toLowerCase().includes(keyword.toLowerCase());
      });
    });

    return Response.json({ keyword, tables });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
