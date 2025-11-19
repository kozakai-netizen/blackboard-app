const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 13306,
    user: 'dandoliworks',
    password: 'YtwU5w_de&Qk',
    database: 'dandolijp'
  });

  console.log('=== 現場567377の情報確認 ===\n');

  // 1. contractsテーブルから現場管理担当者を取得
  console.log('1. contracts テーブル（現場管理担当者）:');
  const [contracts] = await connection.query(`
    SELECT * FROM contracts WHERE site_id = 567377
  `);
  console.log(JSON.stringify(contracts, null, 2));

  // 2. v_managersビューから取得
  console.log('\n2. v_managers ビュー:');
  const [managers] = await connection.query(`
    SELECT * FROM v_managers WHERE site_id = 567377
  `);
  console.log(JSON.stringify(managers, null, 2));

  // 3. sites_crewsテーブルから役割担当者・参加者を取得
  console.log('\n3. sites_crews テーブル（役割担当者・参加者）:');
  const [crews] = await connection.query(`
    SELECT * FROM sites_crews WHERE site_id = 567377 AND deleted = 0
  `);
  console.log(JSON.stringify(crews, null, 2));

  // 4. ユーザー40824の情報
  console.log('\n4. ユーザー40824の情報:');
  const [user] = await connection.query(`
    SELECT u.id, u.username, CONCAT(p.user_last_name, p.user_first_name) AS name
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = 40824
  `);
  console.log(JSON.stringify(user, null, 2));

  await connection.end();
}

main().catch(console.error);
