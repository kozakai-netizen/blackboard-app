// DB調査スクリプト Part 2: site_casts（役割担当者）とsitesテーブルの詳細調査
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function investigate() {
  console.log('\n' + '='.repeat(80));
  console.log('【DB調査 Part 2】site_casts（役割担当者）とsitesテーブルの詳細調査');
  console.log('='.repeat(80) + '\n');

  try {
    // ==========================================
    // 1. sitesテーブルの構造確認
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. sitesテーブルの構造確認');
    console.log('='.repeat(80));

    const sitesColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM sites');
      return rows as any[];
    });

    console.log('\n【テーブル構造】\n');
    sitesColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${nullInfo}`);
    });

    // manager系のカラムを抽出
    const managerCols = sitesColumns
      .map((c: any) => c.Field)
      .filter((f: string) => f.includes('manager') || f.includes('admin') || f.includes('user'));

    console.log('\n【現場管理担当者に関連しそうなカラム】\n');
    if (managerCols.length > 0) {
      managerCols.forEach((col: string) => {
        console.log(`  - ${col}`);
      });
    } else {
      console.log('  ⚠️ 見つかりませんでした');
    }

    // site_id = 567377 のレコード取得
    console.log('\n【SQL】site_id = 567377 のレコード\n');
    const site567377 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM sites WHERE id = ?',
        [567377]
      );
      return rows as any[];
    });

    if (site567377.length > 0) {
      const site = site567377[0];
      console.log('  ✅ 現場が見つかりました:\n');
      console.log(`    ID: ${site.id}`);
      console.log(`    現場名: ${site.name}`);
      console.log(`    place_id: ${site.place_id}`);

      // manager系フィールドの値を表示
      console.log('\n    現場管理担当者関連フィールド:');
      managerCols.forEach((col: string) => {
        if (site[col] !== undefined && site[col] !== null) {
          console.log(`      ${col}: ${site[col]}`);
        }
      });

      // 40824が含まれるフィールドをチェック
      console.log('\n    🔍 40824が含まれるフィールド:');
      const fieldsWithUser = Object.keys(site).filter(
        (key) => site[key] === 40824 || site[key] === '40824'
      );
      if (fieldsWithUser.length > 0) {
        fieldsWithUser.forEach((field) => {
          console.log(`      ✅ ${field}: ${site[field]}`);
        });
      } else {
        console.log('      ❌ 40824は見つかりませんでした');
      }
    } else {
      console.log('  ❌ 現場が見つかりませんでした');
    }

    // ==========================================
    // 2. site_castsテーブルの構造確認
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. site_castsテーブル（役割担当者）の構造確認');
    console.log('='.repeat(80));

    const castsColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM site_casts');
      return rows as any[];
    });

    console.log('\n【テーブル構造】\n');
    castsColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${nullInfo}`);
    });

    // site_id = 567377 のレコード取得
    console.log('\n【SQL】site_id = 567377 のレコード\n');
    const casts567377 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM site_casts WHERE site_id = ?',
        [567377]
      );
      return rows as any[];
    });

    console.log(`  結果: ${casts567377.length}件のレコード\n`);

    if (casts567377.length > 0) {
      casts567377.forEach((cast: any, i: number) => {
        console.log(`  [${i + 1}] ${JSON.stringify(cast)}`);
      });

      // 40824が含まれるレコードをチェック
      const castsWithUser = casts567377.filter((c: any) =>
        Object.values(c).some((v) => v === 40824 || v === '40824')
      );

      console.log(`\n  🔍 40824が含まれるレコード: ${castsWithUser.length}件\n`);
      if (castsWithUser.length > 0) {
        castsWithUser.forEach((cast: any, i: number) => {
          console.log(`    [${i + 1}] ${JSON.stringify(cast)}`);
        });
      }
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    // ==========================================
    // 3. prime_contract_sites_crewsテーブルの確認
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('3. prime_contract_sites_crewsテーブル（元請け契約の現場参加者）の確認');
    console.log('='.repeat(80));

    const primeColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM prime_contract_sites_crews');
      return rows as any[];
    });

    console.log('\n【テーブル構造】\n');
    primeColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${nullInfo}`);
    });

    // site_id = 567377 のレコード取得
    console.log('\n【SQL】site_id = 567377 のレコード\n');
    const primeCrews = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM prime_contract_sites_crews WHERE site_id = ?',
        [567377]
      );
      return rows as any[];
    });

    console.log(`  結果: ${primeCrews.length}件のレコード\n`);

    if (primeCrews.length > 0) {
      primeCrews.forEach((crew: any, i: number) => {
        console.log(`  [${i + 1}] ${JSON.stringify(crew)}`);
      });

      // 40824が含まれるレコードをチェック
      const crewsWithUser = primeCrews.filter((c: any) =>
        Object.values(c).some((v) => v === 40824 || v === '40824')
      );

      console.log(`\n  🔍 40824が含まれるレコード: ${crewsWithUser.length}件\n`);
      if (crewsWithUser.length > 0) {
        crewsWithUser.forEach((crew: any, i: number) => {
          console.log(`    [${i + 1}] ${JSON.stringify(crew)}`);
        });
      }
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    // ==========================================
    // 4. v_managers ビューの確認
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('4. v_managers ビュー（現場管理担当者ビュー）の確認');
    console.log('='.repeat(80));

    try {
      const vManagersColumns = await withSshMysql(async (conn) => {
        const [rows] = await conn.query('SHOW COLUMNS FROM v_managers');
        return rows as any[];
      });

      console.log('\n【ビュー構造】\n');
      vManagersColumns.forEach((col: any) => {
        const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${nullInfo}`);
      });

      // site_id = 567377 のレコード取得
      console.log('\n【SQL】site_id = 567377 のレコード\n');
      const vManagers567377 = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(
          'SELECT * FROM v_managers WHERE site_id = ?',
          [567377]
        );
        return rows as any[];
      });

      console.log(`  結果: ${vManagers567377.length}件のレコード\n`);

      if (vManagers567377.length > 0) {
        vManagers567377.forEach((mgr: any, i: number) => {
          console.log(`  [${i + 1}] ${JSON.stringify(mgr)}`);
        });

        // 40824が含まれるレコードをチェック
        const mgrsWithUser = vManagers567377.filter((m: any) =>
          Object.values(m).some((v) => v === 40824 || v === '40824')
        );

        console.log(`\n  🔍 40824が含まれるレコード: ${mgrsWithUser.length}件\n`);
        if (mgrsWithUser.length > 0) {
          mgrsWithUser.forEach((mgr: any, i: number) => {
            console.log(`    [${i + 1}] ${JSON.stringify(mgr)}`);
          });
        }
      } else {
        console.log('  ❌ レコードが見つかりませんでした');
      }
    } catch (error: any) {
      console.log(`  ⚠️ v_managersビューへのアクセスエラー: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Part 2 調査完了');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

investigate();
