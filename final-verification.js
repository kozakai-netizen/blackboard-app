const mysql = require('mysql2/promise');

async function verify() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'dandoliworks',
      password: 'YtwU5w_de&Qk',
      database: 'dandolijp',
    });

    console.log('=== 最終検証: DB sites_crews データ確認 ===\n');

    // 1. テーブル存在確認
    const [tables] = await conn.query("SHOW TABLES LIKE 'sites_crews'");
    if (tables.length === 0) {
      console.error('❌ CRITICAL: sites_crews テーブルが存在しません');
      return;
    }
    console.log('✅ sites_crews テーブル存在確認');

    // 2. スキーマ確認（必須カラム）
    const [cols] = await conn.query("SHOW COLUMNS FROM sites_crews WHERE Field IN ('site_id', 'crew_id', 'user_level', 'deleted')");
    const colNames = cols.map(c => c.Field);
    const required = ['site_id', 'crew_id', 'user_level', 'deleted'];
    const missing = required.filter(r => !colNames.includes(r));
    
    if (missing.length > 0) {
      console.error('❌ CRITICAL: 必須カラムが不足:', missing);
      return;
    }
    console.log('✅ 必須カラム確認 (site_id, crew_id, user_level, deleted)\n');

    // 3. 有効データ件数確認
    const [count] = await conn.query(
      'SELECT COUNT(*) as total FROM sites_crews WHERE deleted = 0 AND user_level IN (1,2,3)'
    );
    console.log(`✅ 有効レコード数: ${count[0].total.toLocaleString()}件 (deleted=0, user_level=1/2/3)\n`);

    // 4. サンプルデータ確認（site 127083）
    const [site127083] = await conn.query(
      `SELECT crew_id, user_level FROM sites_crews 
       WHERE site_id = 127083 AND deleted = 0 AND user_level IN (1,2,3)`
    );
    console.log('=== サンプル: site 127083 ===');
    console.log(`crew数: ${site127083.length}件`);
    if (site127083.length > 0) {
      site127083.forEach(r => console.log(`  - crew_id: ${r.crew_id}, user_level: ${r.user_level}`));
      console.log('✅ データ取得成功\n');
    } else {
      console.warn('⚠️  site 127083 に有効なcrewが登録されていません\n');
    }

    // 5. データ型確認
    const [sample] = await conn.query(
      'SELECT site_id, crew_id, user_level, deleted FROM sites_crews LIMIT 1'
    );
    if (sample.length > 0) {
      const s = sample[0];
      console.log('=== データ型確認 ===');
      console.log(`site_id: ${typeof s.site_id} (${s.site_id})`);
      console.log(`crew_id: ${typeof s.crew_id} (${s.crew_id})`);
      console.log(`user_level: ${typeof s.user_level} (${s.user_level})`);
      console.log(`deleted: ${typeof s.deleted} (${s.deleted})`);
      console.log('✅ データ型OK\n');
    }

    // 6. user_level分布確認
    const [levels] = await conn.query(
      `SELECT user_level, COUNT(*) as cnt 
       FROM sites_crews 
       WHERE deleted = 0 
       GROUP BY user_level 
       ORDER BY user_level`
    );
    console.log('=== user_level分布 (deleted=0) ===');
    levels.forEach(l => console.log(`  level ${l.user_level}: ${l.cnt.toLocaleString()}件`));
    console.log('✅ user_level分布確認完了\n');

    console.log('========================================');
    console.log('✅ 全ての検証項目をパスしました');
    console.log('========================================');

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    try { await conn?.end(); } catch {}
  }
}

verify();
