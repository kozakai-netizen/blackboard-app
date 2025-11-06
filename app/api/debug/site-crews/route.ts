import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const siteCode = searchParams.get('site_code') || '1315345';

  let conn;
  try {
    conn = await mysql.createConnection({
      host: 'localhost',
      port: 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'dandolijp',
    });

    // 現場コード → site_id → crews → users の紐付けを確認
    const [siteInfo] = await conn.query<any[]>(`
      SELECT id, site_code, site_name FROM sites WHERE site_code = ? LIMIT 1
    `, [siteCode]);

    let crewsInfo = [];
    if (siteInfo.length > 0) {
      const siteId = siteInfo[0].id;
      [crewsInfo] = await conn.query<any[]>(`
        SELECT
          sc.id,
          sc.site_id,
          sc.crew_id,
          sc.user_level,
          c.user_id,
          u.username,
          CONCAT(p.user_last_name, p.user_first_name) AS name
        FROM sites_crews sc
        LEFT JOIN crews c ON sc.crew_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE sc.site_id = ? AND sc.deleted = 0
      `, [siteId]);
    }

    const [rows] = await conn.query<any[]>(`SELECT * FROM sites_crews LIMIT 5`);

    return NextResponse.json({
      ok: true,
      siteCode,
      site: siteInfo[0] || null,
      crewsInfo,
      sampleCrews: rows
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Internal error' }, { status: 500 });
  } finally {
    if (conn) await conn.end();
  }
}
