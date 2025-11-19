// ログイン情報を検索
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function findLoginInfo() {
  console.log('\n' + '='.repeat(80));
  console.log('【ログイン情報検索】');
  console.log('='.repeat(80) + '\n');

  const targetUsers = [40824, 38378];

  for (const userId of targetUsers) {
    console.log(`user_id=${userId} のログイン情報:\n`);

    try {
      const userInfo = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(
          `SELECT id, name, login_id, email
           FROM users
           WHERE id = ?`,
          [userId]
        );
        return rows as any[];
      });

      if (userInfo.length > 0) {
        const user = userInfo[0];
        console.log(`  name: ${user.name}`);
        console.log(`  login_id: ${user.login_id || 'N/A'}`);
        console.log(`  email: ${user.email || 'N/A'}`);
      } else {
        console.log('  ❌ ユーザー情報が見つかりません');
      }
    } catch (error: any) {
      console.error('  ❌ エラー:', error.message);
    }

    console.log('\n' + '-'.repeat(80) + '\n');
  }
}

findLoginInfo();
