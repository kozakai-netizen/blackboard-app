// app/api/stg-attachments-schema/route.ts
import { withSshMysql } from "@/lib/db/sshMysql";

export async function GET() {
  try {
    const schema = await withSshMysql(async (conn) => {
      const [columns] = await conn.query<any[]>('DESCRIBE attachments');
      return columns;
    });

    return Response.json({ schema });
  } catch (e: any) {
    console.error('❌ [GET /api/stg-attachments-schema] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
