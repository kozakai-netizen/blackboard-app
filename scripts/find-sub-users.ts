// 協力業者ユーザーを検索
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';
import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function findSubUsers() {
  console.log('\n' + '='.repeat(80));
  console.log('【協力業者ユーザーの検索】');
  console.log('='.repeat(80) + '\n');

  console.log('place_id=170で、元請け会社ID以外のユーザーを検索します...\n');

  try {
    // 元請け会社ID以外のユーザーを検索
    const subUsers = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        `SELECT DISTINCT c.user_id, c.company_id, c.user_level
         FROM crews c
         WHERE c.place_id = 170
           AND c.deleted = 0
           AND c.company_id NOT IN (98315, 203104)
         LIMIT 10`
      );
      return rows as any[];
    });

    console.log(`協力業者候補: ${subUsers.length}名\n`);

    for (const user of subUsers) {
      const role = await getRoleForPlace(user.user_id, 170);
      console.log(`user_id=${user.user_id}, company_id=${user.company_id}, user_level=${user.user_level} → ${role}`);
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

findSubUsers();
