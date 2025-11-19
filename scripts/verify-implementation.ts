// 実装の総合検証スクリプト
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';
import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function verifyImplementation() {
  console.log('\n' + '='.repeat(80));
  console.log('【ロールベースアクセス制御 実装検証】');
  console.log('='.repeat(80) + '\n');

  // 1. v_my_sitesビューのデータ確認
  console.log('1. v_my_sitesビューのデータ確認（user_id=40824）');
  console.log('-'.repeat(80));

  try {
    const vmySites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT site_id, user_id, relation_type
         FROM v_my_sites
         WHERE user_id = 40824
         LIMIT 10`
      );
      return rows as any[];
    });

    console.log(`v_my_sitesレコード数: ${vmySites.length}件`);
    if (vmySites.length > 0) {
      console.log('サンプルデータ:');
      vmySites.slice(0, 5).forEach((row: any) => {
        console.log(`  site_id=${row.site_id}, user_id=${row.user_id}, relation_type=${row.relation_type}`);
      });
    }
  } catch (error: any) {
    console.error('❌ v_my_sites取得エラー:', error.message);
  }

  console.log('');

  // 2. crewsテーブル確認（user_id=40824, place_id=170）
  console.log('2. crewsテーブル確認（user_id=40824, place_id=170）');
  console.log('-'.repeat(80));

  try {
    const crews = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, user_id, place_id, user_level, company_id, deleted
         FROM crews
         WHERE user_id = 40824 AND place_id = 170 AND deleted = 0`
      );
      return rows as any[];
    });

    console.log(`crewsレコード数: ${crews.length}件`);
    crews.forEach((crew: any) => {
      console.log(`  crew_id=${crew.id}, user_level=${crew.user_level}, company_id=${crew.company_id}`);
    });
  } catch (error: any) {
    console.error('❌ crews取得エラー:', error.message);
  }

  console.log('');

  // 3. getRoleForPlace関数テスト
  console.log('3. getRoleForPlace関数テスト');
  console.log('-'.repeat(80));

  const testUsers = [
    { userId: 40824, placeId: 170, description: 'user_id=40824（元請け会社所属）' },
    { userId: 67463, placeId: 170, description: 'user_id=67463（プレイスowner）' },
  ];

  for (const test of testUsers) {
    try {
      const role = await getRoleForPlace(test.userId, test.placeId);
      console.log(`✅ ${test.description} → ${role}`);
    } catch (error: any) {
      console.error(`❌ ${test.description} → ERROR: ${error.message}`);
    }
  }

  console.log('');

  // 4. 元請け会社ID一覧確認
  console.log('4. 元請け会社ID一覧確認（place_id=170）');
  console.log('-'.repeat(80));

  try {
    const companies = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT DISTINCT company_id
         FROM crews
         WHERE place_id = 170
           AND company_id IN (98315, 203104)
           AND deleted = 0`
      );
      return rows as any[];
    });

    console.log('元請け会社ID:', companies.map((c: any) => c.company_id).join(', '));
  } catch (error: any) {
    console.error('❌ 会社ID取得エラー:', error.message);
  }

  console.log('');

  // 5. DB接続テスト（複数回）
  console.log('5. DB接続安定性テスト（3回連続）');
  console.log('-'.repeat(80));

  for (let i = 1; i <= 3; i++) {
    try {
      const result = await withSshMysql(async (conn) => {
        const [rows] = await conn.query('SELECT 1 AS test');
        return (rows as any[])[0].test;
      });
      console.log(`✅ 接続テスト${i}: 成功 (result=${result})`);
    } catch (error: any) {
      console.error(`❌ 接続テスト${i}: 失敗 (${error.message})`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('【検証完了】');
  console.log('='.repeat(80) + '\n');
}

verifyImplementation();
