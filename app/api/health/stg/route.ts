// app/api/_health/stg/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  try {
    const out = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT 1 AS ok");
      return { ssh: "ok", db: "ok", ping: rows };
    });
    return Response.json(out);
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ssh: "fail", error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
