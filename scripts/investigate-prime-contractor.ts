// 元請け vs 協力業者の判定方法を調査
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function investigatePrimeContractor() {
  console.log('\n' + '='.repeat(80));
  console.log('【元請け vs 協力業者の判定方法調査】');
  console.log('='.repeat(80) + '\n');

  try {
    // ==========================================
    // 1. crewsテーブルの構造確認
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. crewsテーブルの構造確認');
    console.log('='.repeat(80) + '\n');

    const crewsColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM crews');
      return rows as any[];
    });

    console.log('【crewsテーブルのカラム一覧】\n');
    crewsColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.Default !== null ? `DEFAULT ${col.Default}` : '';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(30)} ${nullInfo.padEnd(10)} ${defaultVal}`);
    });

    // ==========================================
    // 2. user_id=40824 (小坂井 優) のcrewsレコード詳細
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. user_id=40824 (小坂井 優) のcrewsレコード詳細');
    console.log('='.repeat(80) + '\n');

    const crew40824 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM crews WHERE user_id = ? LIMIT 5',
        [40824]
      );
      return rows as any[];
    });

    console.log(`結果: ${crew40824.length}件のレコード\n`);

    if (crew40824.length > 0) {
      const firstCrew = crew40824[0] as any;
      console.log('【最初のレコードの全フィールド】\n');
      Object.entries(firstCrew).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(30)}: ${value}`);
      });
    }

    // ==========================================
    // 3. placesテーブルの構造確認
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('3. placesテーブルの構造確認');
    console.log('='.repeat(80) + '\n');

    const placesColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM places');
      return rows as any[];
    });

    console.log('【placesテーブルのカラム一覧】\n');
    placesColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(30)} ${nullInfo}`);
    });

    // ==========================================
    // 4. place_id=170 の詳細情報
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('4. place_id=170 の詳細情報');
    console.log('='.repeat(80) + '\n');

    const place170 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM places WHERE id = ?',
        [170]
      );
      return rows as any[];
    });

    if (place170.length > 0) {
      const placeData = place170[0] as any;
      console.log('【place_id=170 の全フィールド】\n');
      Object.entries(placeData).forEach(([key, value]) => {
        console.log(`  ${key.padEnd(30)}: ${value}`);
      });
    }

    // ==========================================
    // 5. prime_contract_* テーブルの存在確認
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('5. prime_contract_* テーブルの存在確認');
    console.log('='.repeat(80) + '\n');

    const primeContractTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dandolijp'
          AND TABLE_NAME LIKE 'prime_contract%'
      `);
      return rows as any[];
    });

    console.log(`結果: ${primeContractTables.length}個のテーブル\n`);
    primeContractTables.forEach((t: any, i: number) => {
      console.log(`  [${i + 1}] ${t.TABLE_NAME}`);
    });

    // prime_contract_sites_crews が存在する場合、構造を確認
    if (primeContractTables.some((t: any) => t.TABLE_NAME === 'prime_contract_sites_crews')) {
      console.log('\n【prime_contract_sites_crewsテーブルの構造】\n');

      const pcscColumns = await withSshMysql(async (conn) => {
        const [rows] = await conn.query('SHOW COLUMNS FROM prime_contract_sites_crews');
        return rows as any[];
      });

      pcscColumns.forEach((col: any) => {
        const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(30)} ${nullInfo}`);
      });

      // user_id=40824 に関連するレコードがあるか確認
      console.log('\n【user_id=40824 に関連するprime_contractレコード】\n');

      const pcsc40824 = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`
          SELECT *
          FROM prime_contract_sites_crews
          WHERE prime_contract_user_id = ?
             OR prime_contract_crew_id IN (
               SELECT id FROM crews WHERE user_id = ?
             )
          LIMIT 10
        `, [40824, 40824]);
        return rows as any[];
      });

      console.log(`結果: ${pcsc40824.length}件のレコード\n`);

      if (pcsc40824.length > 0) {
        pcsc40824.forEach((r: any, i: number) => {
          console.log(`[${i + 1}]`);
          Object.entries(r).forEach(([key, value]) => {
            console.log(`  ${key.padEnd(30)}: ${value}`);
          });
          console.log('');
        });
      }
    }

    // ==========================================
    // 6. companiesテーブルの存在確認と構造
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('6. companiesテーブルの存在確認');
    console.log('='.repeat(80) + '\n');

    const companyTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dandolijp'
          AND (TABLE_NAME LIKE '%compan%' OR TABLE_NAME LIKE '%firm%')
      `);
      return rows as any[];
    });

    console.log(`結果: ${companyTables.length}個のテーブル\n`);
    companyTables.forEach((t: any, i: number) => {
      console.log(`  [${i + 1}] ${t.TABLE_NAME}`);
    });

    // ==========================================
    // 7. crewsテーブルのuser_levelやpermissionカラムの値分布
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('7. crewsテーブルのuser_levelやpermission的なカラムの値分布');
    console.log('='.repeat(80) + '\n');

    // user_levelカラムがあるか確認
    const hasUserLevel = crewsColumns.some((c: any) => c.Field === 'user_level');
    const hasPermission = crewsColumns.some((c: any) => c.Field === 'permission');
    const hasRole = crewsColumns.some((c: any) => c.Field === 'role');
    const hasType = crewsColumns.some((c: any) => c.Field === 'type');

    console.log(`user_levelカラム: ${hasUserLevel ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`permissionカラム: ${hasPermission ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`roleカラム: ${hasRole ? '✅ 存在' : '❌ 存在しない'}`);
    console.log(`typeカラム: ${hasType ? '✅ 存在' : '❌ 存在しない'}\n`);

    // ==========================================
    // まとめ
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('【調査結果まとめ】');
    console.log('='.repeat(80) + '\n');

    console.log('元請け vs 協力業者の判定候補:\n');
    console.log('1. prime_contract_sites_crews テーブル');
    console.log('   - prime_contract_place_id が自社place_idと一致 → 元請け');
    console.log('   - 一致しない → 協力業者\n');

    console.log('2. places テーブルの owner/admin 情報');
    console.log('   - 現場のplace_idと、ユーザーの所属place_idを比較\n');

    console.log('3. crews テーブルの user_level / permission / role フィールド');
    console.log('   - フィールドが存在すれば、値の分布から判定可能\n');

    console.log('4. sites_crews の user_level');
    console.log('   - user_level=1,2,3 などで権限を区別している可能性\n');

    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

investigatePrimeContractor();
