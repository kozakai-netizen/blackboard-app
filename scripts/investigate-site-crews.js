// DB調査スクリプト: 40824と567377の紐付け状況確認
const mysql = require('mysql2/promise');

async function investigate() {
  let conn;
  try {
    console.log('=== DB調査開始 ===\n');
    console.log('対象:');
    console.log('  - プレイスID: 170');
    console.log('  - ユーザーID: 40824 (小坂井 優)');
    console.log('  - 現場ID: 567377 (山本様邸新築工事)');
    console.log('  - DB: STG Work DB (dandolijp via 127.0.0.1:13306)\n');

    conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 13306,
      user: 'dandoliworks',
      password: 'YtwU5w_de&Qk',
      database: 'dandolijp',
      connectTimeout: 10000
    });

    console.log('✅ DB接続成功\n');

    // ==========================================
    // 4-1. sites_crewsでの紐付け状況確認
    // ==========================================
    console.log('='.repeat(60));
    console.log('4-1. sites_crewsテーブルでの40824と567377の紐付け状況');
    console.log('='.repeat(60));

    // まず、テーブル構造を確認
    console.log('\n【テーブル構造】');
    const [columns] = await conn.query('SHOW COLUMNS FROM sites_crews');
    columns.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 567377の全レコード確認
    console.log('\n【SQL1】site_id = 567377 の全レコード');
    console.log('SQL:');
    console.log(`  SELECT * FROM sites_crews WHERE site_id = 567377;`);
    console.log('\n結果:');
    const [site567377All] = await conn.query(
      'SELECT * FROM sites_crews WHERE site_id = ?',
      [567377]
    );
    if (site567377All.length > 0) {
      console.log(`  ${site567377All.length}件のレコードが見つかりました:`);
      site567377All.forEach((r, i) => {
        console.log(`\n  [${i + 1}] site_id=${r.site_id}, user_id=${r.user_id}, role_level=${r.role_level}, deleted=${r.deleted}`);
        console.log(`      その他: ${JSON.stringify(r, null, 2).split('\n').join('\n      ')}`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    // 40824 + 567377の組み合わせ確認
    console.log('\n【SQL2】site_id = 567377 AND user_id = 40824');
    console.log('SQL:');
    console.log(`  SELECT * FROM sites_crews WHERE site_id = 567377 AND user_id = 40824;`);
    console.log('\n結果:');
    const [combo] = await conn.query(
      'SELECT * FROM sites_crews WHERE site_id = ? AND user_id = ?',
      [567377, 40824]
    );
    if (combo.length > 0) {
      console.log(`  ✅ ${combo.length}件のレコードが見つかりました:`);
      combo.forEach((r, i) => {
        console.log(`\n  [${i + 1}] role_level=${r.role_level}, deleted=${r.deleted}`);
        console.log(`      全データ: ${JSON.stringify(r, null, 2).split('\n').join('\n      ')}`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
      console.log('  → これが「紐づいていない」と判断した根拠です');
    }

    // 40824が担当している現場一覧（サンプル10件）
    console.log('\n【SQL3】user_id = 40824 の担当現場（サンプル10件）');
    console.log('SQL:');
    console.log(`  SELECT site_id, role_level, deleted FROM sites_crews WHERE user_id = 40824 LIMIT 10;`);
    console.log('\n結果:');
    const [user40824Sites] = await conn.query(
      'SELECT site_id, role_level, deleted FROM sites_crews WHERE user_id = ? LIMIT 10',
      [40824]
    );
    if (user40824Sites.length > 0) {
      console.log(`  ${user40824Sites.length}件が見つかりました:`);
      user40824Sites.forEach((r, i) => {
        console.log(`  [${i + 1}] site_id=${r.site_id}, role_level=${r.role_level}, deleted=${r.deleted}`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    console.log('\n' + '='.repeat(60));
    console.log('4-1の結論:');
    console.log('  sites_crewsテーブルには、site_id=567377 と user_id=40824');
    console.log('  の組み合わせが' + (combo.length > 0 ? '存在します' : '存在しません'));
    console.log('='.repeat(60));

  } catch (e) {
    console.error('\n❌ エラー:', e.message);
    console.error('Stack:', e.stack);
  } finally {
    try { await conn?.end(); console.log('\n[Connection closed]'); } catch {}
  }
}

investigate();
