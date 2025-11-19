// 網羅的なテストスクリプト
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { getRoleForPlace } from '../lib/auth/getRoleForPlace';

async function comprehensiveTest() {
  console.log('\n' + '='.repeat(80));
  console.log('【網羅的なテスト】');
  console.log('='.repeat(80) + '\n');

  const testCases = [
    // 正常系
    { userId: 40824, placeId: 170, expected: 'prime', description: '元請け会社所属（company_id=98315,203104）' },
    { userId: 67463, placeId: 170, expected: 'prime', description: 'プレイスowner（company_id=98315）' },
    { userId: 38378, placeId: 170, expected: 'sub', description: '協力業者（company_id=98338）' },
    { userId: 38452, placeId: 170, expected: 'sub', description: '協力業者（company_id=98342）' },

    // エッジケース
    { userId: 99999, placeId: 170, expected: 'sub', description: '存在しないユーザー' },
    { userId: 40824, placeId: 999, expected: 'sub', description: '存在しないプレイス' },
    { userId: 0, placeId: 170, expected: 'sub', description: 'user_id=0' },
    { userId: -1, placeId: 170, expected: 'sub', description: 'user_id=-1（負の値）' },
    { userId: 40824, placeId: 0, expected: 'sub', description: 'place_id=0' },
  ];

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`\nテスト: ${testCase.description}`);
    console.log(`  userId: ${testCase.userId}, placeId: ${testCase.placeId}`);
    console.log(`  期待値: ${testCase.expected}`);

    try {
      const result = await getRoleForPlace(testCase.userId, testCase.placeId);
      console.log(`  結果: ${result}`);

      if (result === testCase.expected) {
        console.log('  ✅ PASS');
        passCount++;
      } else {
        console.log(`  ❌ FAIL - 期待値: ${testCase.expected}, 実際: ${result}`);
        failCount++;
      }
    } catch (error: any) {
      console.error(`  ❌ ERROR: ${error.message}`);
      failCount++;
    }

    console.log('-'.repeat(80));
  }

  console.log('\n' + '='.repeat(80));
  console.log('【テスト結果】');
  console.log('='.repeat(80));
  console.log(`PASS: ${passCount}/${testCases.length}`);
  console.log(`FAIL: ${failCount}/${testCases.length}`);
  console.log('='.repeat(80) + '\n');
}

comprehensiveTest();
