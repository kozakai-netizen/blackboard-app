// エラーハンドリングのテスト
import { config } from 'dotenv';
import { resolve } from 'path';

// DB_PASSWORDを空にしてDB接続エラーを意図的に発生させる
process.env.DB_PASSWORD = '';

config({ path: resolve(__dirname, '../.env.local') });

import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function testErrorHandling() {
  console.log('\n' + '='.repeat(80));
  console.log('【エラーハンドリングテスト】');
  console.log('='.repeat(80) + '\n');

  console.log('DB_PASSWORDを空にしてDB接続エラーを発生させます...\n');

  try {
    const result = await getRoleForPlace(40824, 170);
    console.log(`\n結果: ${result}`);

    if (result === 'unknown') {
      console.log('✅ 正しく "unknown" が返されました');
    } else {
      console.log(`❌ 予期しない結果: ${result}（期待値: "unknown"）`);
    }
  } catch (error: any) {
    console.error('❌ 例外が発生しました:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

testErrorHandling();
