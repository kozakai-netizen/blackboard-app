// DB調査スクリプト: 40824と567377の紐付け + 担当現場の定義を明確化
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function investigate() {
  console.log('\n' + '='.repeat(80));
  console.log('【DB調査】40824と567377の紐付け状況 + 担当現場の定義');
  console.log('='.repeat(80));
  console.log('\n対象:');
  console.log('  - プレイスID: 170');
  console.log('  - プレイスコード: dandoli-sample1');
  console.log('  - ユーザーID: 40824 (小坂井 優)');
  console.log('  - 現場ID: 567377 (山本様邸新築工事・太陽光未定)');
  console.log('  - DB: STG Work DB (dandolijp)\n');

  try {
    // ==========================================
    // 4-1. sites_crewsでの紐付け状況確認
    // ==========================================
    console.log('='.repeat(80));
    console.log('4-1. sites_crewsテーブルでの40824と567377の紐付け状況');
    console.log('='.repeat(80));

    // テーブル構造確認
    console.log('\n【テーブル構造】');
    const columns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM sites_crews');
      return rows as any[];
    });

    columns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${nullInfo}`);
    });

    // SQL1: site_id = 567377 の全レコード
    console.log('\n【SQL1】site_id = 567377 の全レコード');
    console.log('SQL:');
    console.log('  SELECT * FROM sites_crews WHERE site_id = 567377;\n');
    console.log('結果:');

    const site567377All = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM sites_crews WHERE site_id = ?',
        [567377]
      );
      return rows as any[];
    });

    if (site567377All.length > 0) {
      console.log(`  ✅ ${site567377All.length}件のレコードが見つかりました:\n`);
      site567377All.forEach((r: any, i: number) => {
        console.log(`  [${i + 1}] id=${r.id}, site_id=${r.site_id}, crew_id=${r.crew_id}, user_level=${r.user_level}, deleted=${r.deleted}`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    // SQL2: site_id = 567377 AND crew_id = 40824
    console.log('\n【SQL2】site_id = 567377 AND crew_id = 40824');
    console.log('SQL:');
    console.log('  SELECT * FROM sites_crews WHERE site_id = 567377 AND crew_id = 40824;\n');
    console.log('結果:');

    const combo = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM sites_crews WHERE site_id = ? AND crew_id = ?',
        [567377, 40824]
      );
      return rows as any[];
    });

    if (combo.length > 0) {
      console.log(`  ✅ ${combo.length}件のレコードが見つかりました:\n`);
      combo.forEach((r: any, i: number) => {
        console.log(`  [${i + 1}] id=${r.id}, user_level=${r.user_level}, deleted=${r.deleted}`);
        console.log(`      全カラム: ${JSON.stringify(r)}\n`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
      console.log('  → これが「紐づいていない」と判断した根拠です\n');
    }

    // SQL3: crew_id = 40824 の担当現場（サンプル10件）
    console.log('【SQL3】crew_id = 40824 の担当現場（サンプル10件）');
    console.log('SQL:');
    console.log('  SELECT site_id, user_level, deleted FROM sites_crews WHERE crew_id = 40824 LIMIT 10;\n');
    console.log('結果:');

    const user40824Sites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT site_id, user_level, deleted FROM sites_crews WHERE crew_id = ? LIMIT 10',
        [40824]
      );
      return rows as any[];
    });

    if (user40824Sites.length > 0) {
      console.log(`  ✅ ${user40824Sites.length}件が見つかりました:\n`);
      user40824Sites.forEach((r: any, i: number) => {
        console.log(`  [${i + 1}] site_id=${r.site_id}, user_level=${r.user_level}, deleted=${r.deleted}`);
      });
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    console.log('\n' + '='.repeat(80));
    console.log('【4-1の結論】');
    console.log(`  sites_crewsテーブルには、site_id=567377 と crew_id=40824 の組み合わせが`);
    console.log(`  ${combo.length > 0 ? '✅ 存在します' : '❌ 存在しません'}`);
    console.log('='.repeat(80));

    // ==========================================
    // 4-2. site_idカラムを持つテーブル一覧
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('4-2. site_idカラムを持つ全テーブルを取得');
    console.log('='.repeat(80));

    console.log('\nSQL:');
    console.log(`  SELECT TABLE_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dandolijp'
    AND COLUMN_NAME = 'site_id';\n`);

    const tablesWithSiteId = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dandolijp'
          AND COLUMN_NAME = 'site_id'
      `);
      return rows as any[];
    });

    console.log('結果:');
    console.log(`  ✅ ${tablesWithSiteId.length}個のテーブルが見つかりました:\n`);
    tablesWithSiteId.forEach((t: any, i: number) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${t.TABLE_NAME}`);
    });

    // ==========================================
    // 4-3. 各テーブルで site_id = 567377 を検索
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('4-3. 各テーブルで site_id=567377 かつ user/crew/manager = 40824 を検索');
    console.log('='.repeat(80));

    const relevantTables = [
      'sites',
      'sites_crews',
      'sites_members',
      'sites_managers',
      'sites_roles',
      'sites_participants',
      'site_users',
      'site_managers',
      'site_members'
    ];

    for (const tableName of relevantTables) {
      const exists = tablesWithSiteId.some((t: any) => t.TABLE_NAME === tableName);
      if (!exists) {
        console.log(`\n[${tableName}]`);
        console.log(`  ⚠️ テーブルが存在しません`);
        continue;
      }

      console.log(`\n[${tableName}]`);

      // テーブル構造を取得
      const cols = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`SHOW COLUMNS FROM ${tableName}`);
        return rows as any[];
      });

      const colNames = cols.map((c: any) => c.Field);
      console.log(`  カラム: ${colNames.join(', ')}`);

      // user/crew/manager系のカラムを探す
      const userCols = colNames.filter((c: string) =>
        c.includes('user') || c.includes('crew') || c.includes('manager') || c.includes('member')
      );

      if (userCols.length === 0) {
        console.log(`  ⚠️ ユーザー関連カラムが見つかりません`);
        continue;
      }

      console.log(`  ユーザー関連カラム: ${userCols.join(', ')}`);

      // site_id = 567377 の全レコード
      const allRecords = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(
          `SELECT * FROM ${tableName} WHERE site_id = ?`,
          [567377]
        );
        return rows as any[];
      });

      console.log(`  site_id=567377 の全レコード数: ${allRecords.length}`);

      if (allRecords.length > 0) {
        // 40824 が含まれるレコードをフィルタ
        const matching = allRecords.filter((r: any) =>
          userCols.some((col: string) => r[col] === 40824 || r[col] === '40824')
        );

        if (matching.length > 0) {
          console.log(`  🎯 40824が含まれるレコード: ${matching.length}件\n`);
          matching.forEach((r: any, i: number) => {
            console.log(`    [${i + 1}] ${JSON.stringify(r)}`);
          });
        } else {
          console.log(`  ❌ 40824は見つかりませんでした`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('調査完了');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

investigate();
