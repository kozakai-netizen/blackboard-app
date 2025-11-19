// user_id=40364の検証
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';
import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function verifyUser40364() {
  console.log('\n' + '='.repeat(80));
  console.log('【user_id=40364の検証】');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. crewsテーブル確認
    const crews = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT id, user_id, place_id, user_level, company_id, deleted
         FROM crews
         WHERE user_id = 40364 AND place_id = 170 AND deleted = 0`
      );
      return rows as any[];
    });

    console.log(`crewsレコード数: ${crews.length}件\n`);

    if (crews.length === 0) {
      console.log('❌ user_id=40364 は place_id=170 に所属していません');
      return;
    }

    crews.forEach((crew: any) => {
      console.log(`crew_id=${crew.id}, user_level=${crew.user_level}, company_id=${crew.company_id}`);
    });

    // 2. ロール判定
    console.log('\n' + '-'.repeat(80));
    const role = await getRoleForPlace(40364, 170);
    console.log(`\nロール判定結果: ${role}`);

    if (role === 'sub') {
      console.log('✅ user_id=40364 は協力業者として判定されました');
    } else {
      console.log(`⚠️  user_id=40364 は ${role} として判定されました（協力業者ではない）`);
    }

    // 3. v_my_sitesで担当現場確認
    console.log('\n' + '-'.repeat(80));
    console.log('担当現場確認（v_my_sites）:\n');

    const sites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT site_id, relation_type
         FROM v_my_sites
         WHERE user_id = 40364
         LIMIT 10`
      );
      return rows as any[];
    });

    console.log(`担当現場数: ${sites.length}件`);
    sites.forEach((site: any) => {
      console.log(`  site_id=${site.site_id}, relation_type=${site.relation_type}`);
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

verifyUser40364();
