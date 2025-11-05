// app/api/stg-users/route.ts
import mysql from 'mysql2/promise';
import { detectUserColumns } from '@/lib/db/schema/users';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "";
  const idRaw = searchParams.get("id");
  const limit = Number(searchParams.get("limit") ?? "50");

  console.log('🔍 [GET /api/stg-users] params:', { name, id: idRaw, limit });

  let conn;
  try {
    // 既存のSSHトンネル（localhost:13306）を使用
    console.log('📊 [stg-users] Connecting to DB via tunnel...');
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    // カラム自動検出
    const map = await detectUserColumns(conn);
    console.log('📋 [stg-users] Detected columns:', map);

    // profilesテーブルとJOINして名前検索
    const where: string[] = [];
    const params: any[] = [];

    if (idRaw) {
      where.push(`u.\`id\` = ?`);
      params.push(Number(idRaw));
    }

    if (name) {
      // profilesテーブルの姓名で検索
      where.push(`(CONCAT(p.user_last_name, p.user_first_name) LIKE ? OR CONCAT(p.user_first_name, p.user_last_name) LIKE ? OR u.\`username\` LIKE ?)`);
      params.push(`%${name}%`, `%${name}%`, `%${name}%`);
    }

    const sql = `
      SELECT
        u.\`id\` AS id,
        u.\`username\` AS username,
        CONCAT(p.user_last_name, p.user_first_name) AS name,
        p.user_first_name,
        p.user_last_name
      FROM users u
      LEFT JOIN profiles p ON u.\`id\` = p.\`user_id\`
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY u.\`id\` DESC
      LIMIT ?
    `;

    params.push(limit);

    console.log('📊 [stg-users] Executing SQL:', sql);
    console.log('📊 [stg-users] Parameters:', params);

    const [rows] = await conn.query<any[]>(sql, params);

    console.log('✅ [stg-users] Found users:', rows.length);

    return Response.json({ users: rows, columns: map });
  } catch (e: any) {
    console.error('❌ [GET /api/stg-users] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message, code: e?.code }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}
