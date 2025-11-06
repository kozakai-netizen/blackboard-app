import { NextResponse } from 'next/server';
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

    const [tables] = await conn.query<any[]>(`SHOW TABLES LIKE '%crew%'`);

    return NextResponse.json({
      ok: true,
      tables
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
