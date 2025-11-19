const mysql = require('mysql2/promise');

async function checkSchema() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 13306,
    user: 'dandolijp',
    password: 'zEbra2013',
    database: 'stg_work'
  });

  const [rows] = await conn.query('DESCRIBE users');
  console.log('=== users table schema ===');
  rows.forEach(r => {
    console.log(`${r.Field.padEnd(20)} ${r.Type.padEnd(20)} ${r.Null} ${r.Key} ${r.Default}`);
  });

  const [sample] = await conn.query('SELECT * FROM users LIMIT 3');
  console.log('\n=== Sample data ===');
  console.log(JSON.stringify(sample, null, 2));

  await conn.end();
}

checkSchema().catch(console.error);
