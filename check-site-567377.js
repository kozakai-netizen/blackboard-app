const mysql = require('mysql2/promise');

async function checkSite() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'dandoliworks',
      password: 'YtwU5w_de&Qk',
      database: 'dandolijp',
    });

    console.log('=== Site 567377のcrew確認 ===\n');

    const [all] = await conn.query(
      `SELECT crew_id, user_level, deleted FROM sites_crews WHERE site_id = 567377`
    );
    console.log(`全レコード: ${all.length}件`);
    console.log(all);

    const [active] = await conn.query(
      `SELECT crew_id, user_level, deleted 
       FROM sites_crews 
       WHERE site_id = 567377 AND deleted = 0 AND user_level IN (1,2,3)`
    );
    console.log(`\n有効レコード (deleted=0, user_level=1/2/3): ${active.length}件`);
    console.log(active);

    const [user40824] = await conn.query(
      `SELECT * FROM sites_crews WHERE site_id = 567377 AND crew_id = 40824`
    );
    console.log(`\nUser 40824のレコード: ${user40824.length}件`);
    console.log(user40824);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    try { await conn?.end(); } catch {}
  }
}

checkSite();
