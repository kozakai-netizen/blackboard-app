import mysql from 'mysql2/promise';

export async function GET() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    // user/member/profile関連のテーブルを検索
    const [tables] = await conn.query<any[]>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = DATABASE()
       AND (table_name LIKE '%user%' OR table_name LIKE '%member%' OR table_name LIKE '%profile%')
       ORDER BY table_name`
    );

    const tableNames = tables.map(t => t.table_name || t.TABLE_NAME);

    // 各テーブルのカラムで「name」を含むものを検索
    const tablesWithNameColumn: any[] = [];
    for (const tableName of tableNames) {
      const [cols] = await conn.query<any[]>(
        `SELECT COLUMN_NAME FROM information_schema.columns
         WHERE table_schema = DATABASE()
         AND table_name = ?
         AND (COLUMN_NAME LIKE '%name%' OR COLUMN_NAME LIKE '%姓%' OR COLUMN_NAME LIKE '%名%')`,
        [tableName]
      );
      if (cols.length > 0) {
        tablesWithNameColumn.push({
          table: tableName,
          columns: cols.map(c => c.COLUMN_NAME)
        });
      }
    }

    return Response.json({
      allUserTables: tableNames,
      tablesWithNameColumn
    });
  } catch (e: any) {
    console.error('❌ [debug/tables] Error:', e);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
