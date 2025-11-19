// Quick DB connection test - updated to check WORK DB
const mysql = require('mysql2/promise');

async function testDB() {
  let conn;
  try {
    console.log('Connecting to STG WORK DB via tunnel...');
    console.log('Connection details:');
    console.log('  Host: 127.0.0.1');
    console.log('  Port: 13306 (tunnels to stg-work-db.dandoli.jp:3306)');
    console.log('  User: dandoliworks');
    console.log('  DB: dandolijp\n');

    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'dandoliworks',
      password: 'YtwU5w_de&Qk',
      database: 'dandolijp',
      connectTimeout: 10000
    });

    console.log('✅ Connected to STG WORK DB!\n');

    // Check if sites_crews table exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'sites_crews'");
    console.log('Tables matching "sites_crews":', tables);

    if (tables.length > 0) {
      console.log('\n✅ sites_crews table EXISTS\n');

      // Show schema
      const [columns] = await conn.query('SHOW COLUMNS FROM sites_crews');
      console.log('Table schema:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      // Count records
      const [count] = await conn.query('SELECT COUNT(*) as total FROM sites_crews');
      console.log(`\nTotal records in sites_crews: ${count[0].total}`);

      // Count records with role_level 1,2,3 and not deleted
      const [activeCount] = await conn.query(
        `SELECT COUNT(*) as active
         FROM sites_crews
         WHERE (deleted IS NULL OR deleted = 0)
           AND COALESCE(role_level, 0) IN (1,2,3)`
      );
      console.log(`Active crew records (role 1/2/3, not deleted): ${activeCount[0].active}\n`);

      // Sample query for site 567377
      console.log('=== Checking site 567377 ===');
      const [site567377] = await conn.query(
        `SELECT site_id, user_id, role_level, deleted
         FROM sites_crews
         WHERE site_id = ?`,
        [567377]  // Use number instead of string
      );
      console.log(`Found ${site567377.length} crew records for site 567377:`);
      if (site567377.length > 0) {
        site567377.forEach(r => {
          console.log(`  - User ${r.user_id}, Role ${r.role_level}, Deleted: ${r.deleted}`);
        });
      } else {
        console.log('  (No records found)');
      }

      // Sample query for user 40824
      console.log('\n=== Checking user 40824 ===');
      const [user40824] = await conn.query(
        `SELECT site_id, user_id, role_level, deleted
         FROM sites_crews
         WHERE user_id = ?
         LIMIT 10`,
        [40824]  // Use number instead of string
      );
      console.log(`Found ${user40824.length} site records for user 40824:`);
      if (user40824.length > 0) {
        user40824.forEach(r => {
          console.log(`  - Site ${r.site_id}, Role ${r.role_level}, Deleted: ${r.deleted}`);
        });
      } else {
        console.log('  (No records found)');
      }

      // Any data sample
      console.log('\n=== Sample data (first 5 records) ===');
      const [sample] = await conn.query('SELECT * FROM sites_crews LIMIT 5');
      console.log(sample);
    } else {
      console.log('\n❌ sites_crews table does NOT exist in this database\n');

      // Show all tables
      console.log('All tables in database dandolijp:');
      const [allTables] = await conn.query('SHOW TABLES');
      allTables.forEach((t, i) => {
        console.log(`  ${i + 1}. ${Object.values(t)[0]}`);
      });
    }

  } catch (e) {
    console.error('\n❌ Error:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    try { await conn?.end(); console.log('\n[Connection closed]'); } catch {}
  }
}

testDB();
