// app/api/stg-blackboards/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  // 本番ビルド保護（必要に応じて）
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STG !== "1") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const rows = await withSshMysql(async (conn) => {
      const [r] = await conn.execute<any[]>(
        `SELECT id, title, remarks, updated_at
           FROM blackboards
           ORDER BY updated_at DESC
           LIMIT 50`
      );
      return r ?? [];
    });

    return Response.json(rows);
  } catch (e: any) {
    console.error("[STG] API error:", e?.code || e?.name, e?.message);
    return new Response(
      JSON.stringify({ error: e?.message || "unknown", code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
