const mysql = require('mysql2/promise');

async function checkUser() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'dandoliworks',
      password: 'YtwU5w_de&Qk',
      database: 'dandolijp',
    });

    console.log('=== User 40824の現場確認 ===\n');

    const [sites] = await conn.query(
      `SELECT site_id, user_level, deleted 
       FROM sites_crews 
       WHERE crew_id = 40824 AND deleted = 0 AND user_level IN (1,2,3)
       LIMIT 10`
    );
    console.log(`User 40824 が登録されている現場 (deleted=0, user_level=1/2/3): ${sites.length}件`);
    console.log(sites);

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    try { await conn?.end(); } catch {}
  }
}

checkUser();
