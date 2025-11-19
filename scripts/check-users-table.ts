// usersテーブルの構造確認
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function checkUsersTable() {
  try {
    const columns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('DESCRIBE users');
      return rows as any[];
    });

    console.log('\nusersテーブルのカラム:\n');
    columns.forEach((col: any) => {
      console.log(`  ${col.Field} (${col.Type})`);
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkUsersTable();
