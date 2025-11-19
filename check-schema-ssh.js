const { withSshMysql } = require('./lib/db/sshMysql.ts');

async function main() {
  try {
    const result = await withSshMysql(async (conn) => {
      const [schema] = await conn.query('DESCRIBE users');
      console.log('=== users table schema ===');
      schema.forEach(r => {
        console.log(`${r.Field.padEnd(25)} ${r.Type.padEnd(20)} Null:${r.Null} Key:${r.Key}`);
      });

      const [sample] = await conn.query('SELECT * FROM users WHERE id IN (40824, 67463) LIMIT 5');
      console.log('\n=== Sample data (id=40824 or 67463) ===');
      console.log(JSON.stringify(sample, null, 2));

      return { schema, sample };
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
