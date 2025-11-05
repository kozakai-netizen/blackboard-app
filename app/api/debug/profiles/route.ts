import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";

  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    // profilesテーブルの全カラムを取得
    const [cols] = await conn.query<any[]>(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'profiles'
       ORDER BY ORDINAL_POSITION`
    );

    const columns = cols.map(c => c.COLUMN_NAME);

    // サンプルデータ取得
    let sql = `SELECT * FROM profiles`;
    const params: any[] = [];

    if (name) {
      sql += ` WHERE CONCAT(user_last_name, user_first_name) LIKE ? OR CONCAT(user_first_name, user_last_name) LIKE ?`;
      params.push(`%${name}%`, `%${name}%`);
    }

    sql += ` LIMIT 5`;

    const [rows] = await conn.query<any[]>(sql, params);

    return Response.json({
      columns,
      sampleData: rows
    });
  } catch (e: any) {
    console.error('❌ [debug/profiles] Error:', e);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
