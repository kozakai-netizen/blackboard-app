import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || 'http://localhost:3000';
    const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE || 'dandoli-sample1';

    // DW APIから現場一覧取得
    const sitesRes = await fetch(
      `${baseUrl}/api/dandori/sites?place_code=${placeCode}&site_status=1,2,3`,
      { cache: 'no-store' }
    );
    const sitesData = await sitesRes.json();
    const sites = Array.isArray(sitesData?.data) ? sitesData.data : [];

    // manager_idを抽出
    const managerIds = sites
      .map((site: any) => site.manager?.admin)
      .filter((id: any) => id)
      .map((id: any) => String(id));

    const uniqueIds = Array.from(new Set(managerIds));

    // MySQLから users テーブル取得
    let conn;
    const matchedIds = new Set<string>();
    const unmatchedIds: string[] = [];

    try {
      conn = await mysql.createConnection({
        host: 'localhost',
        port: 13306,
        user: process.env.DB_USER || 'dandoliworks',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'dandolijp',
      });

      // id, username のいずれかでマッチするかチェック
      for (const id of uniqueIds) {
        const sql = `
          SELECT id
          FROM users
          WHERE id = ? OR username = ?
          LIMIT 1
        `;

        const [rows] = await conn.query<any[]>(sql, [id, id]);

        if (rows.length > 0) {
          matchedIds.add(id);
        } else {
          unmatchedIds.push(id);
        }
      }
    } catch (e: any) {
      return NextResponse.json({
        ok: false,
        error: e?.message || 'Database error',
      }, { status: 500 });
    } finally {
      if (conn) await conn.end();
    }

    return NextResponse.json({
      ok: true,
      checked: uniqueIds.length,
      matched: matchedIds.size,
      unmatched: unmatchedIds.length,
      unmatched_sample: unmatchedIds.slice(0, 10),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Unknown error',
    }, { status: 500 });
  }
}
