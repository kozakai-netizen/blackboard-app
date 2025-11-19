const mysql = require('mysql2/promise');
const { createSSHTunnel } = require('../lib/db/createSSHTunnel.js');

async function checkUser40364() {
  let tunnel;
  try {
    console.log('🔌 SSHトンネル接続中...');
    tunnel = await createSSHTunnel();

    console.log('📊 DB接続中...');
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: tunnel.localPort,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('\n📋 user_id=40364 の crews レコード確認（place_id=170のみ）\n');

    const [rows] = await connection.query(
      'SELECT id as crew_id, user_id, place_id, user_level, company_id, deleted FROM crews WHERE user_id = 40364 AND place_id = 170 AND deleted = 0',
      []
    );

    console.log('検索結果:', rows.length, '件\n');

    if (rows.length === 0) {
      console.log('❌ user_id=40364 は place_id=170 に所属していません');
    } else {
      console.table(rows);

      const primeCompanyIds = [98315, 203104];
      const isPrime = rows.some(r =>
        r.user_level === 1 ||
        (r.company_id && primeCompanyIds.includes(r.company_id))
      );

      console.log('\n🎯 ロール判定結果:');
      console.log('元請け会社ID:', primeCompanyIds);
      console.log('判定:', isPrime ? '元請け (prime)' : '協力業者 (sub)');

      rows.forEach(r => {
        const isPrimeCompany = r.company_id && primeCompanyIds.includes(r.company_id);
        console.log('  - crew_id=' + r.crew_id + ': company_id=' + r.company_id + ', user_level=' + r.user_level + ' → ' + (isPrimeCompany ? '元請け' : '協力業者'));
      });
    }

    await connection.end();
    tunnel.server.close();
    tunnel.sshConnection.end();

  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (tunnel) {
      if (tunnel.server) tunnel.server.close();
      if (tunnel.sshConnection) tunnel.sshConnection.end();
    }
    process.exit(1);
  }
}

checkUser40364();
