import mysql from 'mysql2/promise';

export async function GET() {
  let conn;
  try {
    console.log('🏥 [health] Connecting to DB via tunnel...');
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    const [rows] = await conn.query("SELECT 1 AS ok");
    console.log('✅ [health] DB connection OK');
    return Response.json({ ok: true, ping: rows });
  } catch (e: any) {
    console.error('❌ [health] DB connection failed:', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message }), { status: 500 });
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}
