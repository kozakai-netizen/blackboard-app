import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ ok: false, error: 'id parameter required' }, { status: 400 });
  }

  console.log('[stg-user-keys] Fetching user for id:', id);

  let conn;
  try {
    // SSHトンネル経由でMySQLに接続（stg-usersと同じ方式）
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    // users + profiles テーブルから取得
    const sql = `
      SELECT
        u.\`id\` AS user_id,
        u.\`username\` AS login_id,
        CONCAT(p.user_last_name, p.user_first_name) AS name
      FROM users u
      LEFT JOIN profiles p ON u.\`id\` = p.\`user_id\`
      WHERE u.\`id\` = ?
      LIMIT 1
    `;

    console.log('[stg-user-keys] Executing SQL:', sql, 'id:', id);

    const [rows] = await conn.query<any[]>(sql, [Number(id)]);

    if (!rows || rows.length === 0) {
      console.log('[stg-user-keys] User not found');
      return NextResponse.json({
        ok: true,
        user: null,
        message: 'User not found'
      });
    }

    const user = rows[0];
    console.log('[stg-user-keys] Found user:', user);

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user.user_id),
        employee_code: user.login_id, // login_idをemployee_codeとして使用
        login_id: user.login_id,
        name: user.name,
        email: null, // MySQLにはemailがないためnull
        phone: null, // MySQLにはphoneがないためnull
        level: null, // MySQLにはlevelがないためnull
        permission: null // MySQLにはpermissionがないためnull
      }
    });
  } catch (e: any) {
    console.error('[stg-user-keys] Error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}
