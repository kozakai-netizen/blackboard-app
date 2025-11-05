import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  try {
    let mode = "auto";
    const data = await withSshMysql(async (c: any) => {
      const [rows] = await c.query("SELECT 1 AS ok");
      return rows;
    });
    // withSshMysql 内の直近モードを拾う
    // @ts-ignore
    mode = (global as any).__DB_MODE_LAST || "auto";
    console.log('✅ [health/full] DB connection OK, mode:', mode);
    return Response.json({ ok: true, mode, sql: data });
  } catch (e: any) {
    console.error('❌ [health/full] DB connection failed:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
}
