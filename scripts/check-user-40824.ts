import { config } from 'dotenv';
config({ path: '.env.local' });

import { getRoleForPlace } from '../lib/auth/getRoleForPlace';
import { withSshMysql } from '../lib/db/sshMysql';

interface CrewRecord {
  crew_id: number;
  user_id: number;
  place_id: number;
  user_level: number;
  company_id: number | null;
  deleted: number;
}

async function checkUser40824() {
  try {
    console.log('\n📋 user_id=40824 の crews レコード確認（place_id=170のみ）\n');

    const rows = await withSshMysql(async (conn) => {
      const [result] = await conn.query<any[]>(
        `SELECT id as crew_id, user_id, place_id, user_level, company_id, deleted
         FROM crews
         WHERE user_id = 40824
           AND place_id = 170
           AND deleted = 0`
      );
      return result as CrewRecord[];
    });

    console.log('検索結果:', rows.length, '件\n');

    if (rows.length === 0) {
      console.log('❌ user_id=40824 は place_id=170 に所属していません');
      return;
    }

    console.table(rows);

    const primeCompanyIds = [98315, 203104];

    // 新しいロジックで判定
    const hasPrimeCompany = rows.some(r =>
      r.company_id !== null && primeCompanyIds.includes(r.company_id)
    );
    const hasSubCompany = rows.some(r =>
      r.company_id !== null && !primeCompanyIds.includes(r.company_id)
    );

    console.log('\n🎯 ロール判定結果（新ロジック）:');
    console.log('元請け会社ID:', primeCompanyIds);
    console.log('元請け company_id を持つ:', hasPrimeCompany);
    console.log('協力業者 company_id を持つ:', hasSubCompany);

    // 新ルール: 協力業者 company_id を1つでも持っていれば協力業者
    const newRole = hasSubCompany ? 'sub' : (hasPrimeCompany ? 'prime' : 'sub');
    console.log('判定結果:', newRole);

    console.log('\n📝 各レコードの詳細:');
    rows.forEach(r => {
      const isPrimeCompany = r.company_id !== null && primeCompanyIds.includes(r.company_id);
      console.log(`  - crew_id=${r.crew_id}: company_id=${r.company_id}, user_level=${r.user_level} → ${isPrimeCompany ? '元請け会社' : '協力業者会社'}`);
    });

    // getRoleForPlace関数で実際に判定
    console.log('\n🔍 getRoleForPlace() 関数での判定結果:');
    const actualRole = await getRoleForPlace(40824, 170);
    console.log('Result:', actualRole);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

checkUser40824();
