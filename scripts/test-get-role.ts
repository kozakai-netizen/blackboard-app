// getRoleForPlace関数のテストスクリプト
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function testGetRole() {
  console.log('\n' + '='.repeat(80));
  console.log('【getRoleForPlace関数テスト】');
  console.log('='.repeat(80) + '\n');

  const testCases = [
    { userId: 40824, placeId: 170, expected: 'prime', description: 'user_id=40824（元請け会社所属）' },
    { userId: 99999, placeId: 170, expected: 'sub', description: 'user_id=99999（存在しないユーザー）' },
    { userId: 67463, placeId: 170, expected: 'prime', description: 'user_id=67463（プレイスowner）' },
  ];

  for (const testCase of testCases) {
    console.log(`\nテスト: ${testCase.description}`);
    console.log(`  userId: ${testCase.userId}, placeId: ${testCase.placeId}`);
    console.log(`  期待値: ${testCase.expected}`);

    try {
      const result = await getRoleForPlace(testCase.userId, testCase.placeId);
      console.log(`  結果: ${result}`);

      if (result === testCase.expected) {
        console.log('  ✅ PASS');
      } else {
        console.log(`  ❌ FAIL - 期待値: ${testCase.expected}, 実際: ${result}`);
      }
    } catch (error: any) {
      console.error(`  ❌ ERROR: ${error.message}`);
    }

    console.log('-'.repeat(80));
  }
}

testGetRole();
