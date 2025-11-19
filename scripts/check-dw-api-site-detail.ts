// DW API調査: 現場567377の詳細情報を取得して、DB結果と比較
import { config } from 'dotenv';
import { resolve } from 'path';

// .env.localを読み込み
config({ path: resolve(__dirname, '../.env.local') });

async function checkDWAPI() {
  const API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE;
  const BEARER_TOKEN = process.env.DW_BEARER_TOKEN;
  const PLACE_CODE = process.env.NEXT_PUBLIC_PLACE_CODE;
  const SITE_CODE = '127083'; // 567377に対応するsite_code

  if (!API_BASE || !BEARER_TOKEN || !PLACE_CODE) {
    console.error('❌ 環境変数が不足しています');
    return;
  }

  console.log('\n' + '='.repeat(80));
  console.log('【DW API調査】現場567377（site_code: 127083）の詳細情報');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. 現場詳細取得
    console.log('1. 現場詳細取得\n');
    console.log(`  GET ${API_BASE}/co/places/${PLACE_CODE}/sites/${SITE_CODE}\n`);

    const siteDetailRes = await fetch(
      `${API_BASE}/co/places/${PLACE_CODE}/sites/${SITE_CODE}`,
      {
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
      }
    );

    if (!siteDetailRes.ok) {
      console.error(`  ❌ HTTPエラー: ${siteDetailRes.status} ${siteDetailRes.statusText}`);
      return;
    }

    const siteDetail = await siteDetailRes.json();

    console.log('  ✅ 取得成功\n');
    console.log(`  現場名: ${siteDetail.name}`);
    console.log(`  現場ID (内部): ${siteDetail.id || '不明'}`);
    console.log(`  プレイスID: ${siteDetail.place_id || '不明'}`);

    // 現場管理担当者情報
    if (siteDetail.manager) {
      console.log('\n  【現場管理担当者 (manager)】');
      console.log(`    構造: ${JSON.stringify(siteDetail.manager, null, 2).split('\n').join('\n    ')}`);

      const adminFields = ['admin', 'sub_admin1', 'sub_admin2', 'sub_admin3'];
      adminFields.forEach((field) => {
        if (siteDetail.manager[field]) {
          console.log(`\n    ${field}: ${siteDetail.manager[field]}`);
          if (siteDetail.manager[field] === '40824' || siteDetail.manager[field] === 40824) {
            console.log(`      🎯 40824 が ${field} に含まれています！`);
          }
        }
      });
    }

    // 2. 現場参加者（site_crews）取得
    console.log('\n' + '='.repeat(80));
    console.log('2. 現場参加者（site_crews）取得\n');
    console.log(`  GET ${API_BASE}/co/places/${PLACE_CODE}/sites/${SITE_CODE}/site_crews\n`);

    const crewsRes = await fetch(
      `${API_BASE}/co/places/${PLACE_CODE}/sites/${SITE_CODE}/site_crews`,
      {
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
      }
    );

    if (!crewsRes.ok) {
      console.error(`  ❌ HTTPエラー: ${crewsRes.status} ${crewsRes.statusText}`);
    } else {
      const crewsData = await crewsRes.json();

      console.log('  ✅ 取得成功\n');

      // casts（役割担当者）
      if (crewsData.casts && Array.isArray(crewsData.casts)) {
        console.log(`  【役割担当者 (casts)】 ${crewsData.casts.length}件\n`);
        crewsData.casts.forEach((cast: any, i: number) => {
          console.log(`    [${i + 1}] cast_name: ${cast.cast_name || '不明'}`);
          console.log(`        cast (user_code): ${cast.cast || '不明'}`);
          console.log(`        role: ${cast.role || '不明'}\n`);

          if (cast.cast === '40824' || cast.cast === 40824) {
            console.log(`        🎯 40824 が役割担当者に含まれています！\n`);
          }
        });
      }

      // workers（参加ユーザー）
      if (crewsData.workers && Array.isArray(crewsData.workers)) {
        console.log(`  【参加ユーザー (workers)】 ${crewsData.workers.length}件\n`);
        crewsData.workers.forEach((worker: any, i: number) => {
          console.log(`    [${i + 1}] worker (user_code): ${worker.worker || '不明'}`);

          if (worker.worker === '40824' || worker.worker === 40824) {
            console.log(`        🎯 40824 が参加ユーザーに含まれています！\n`);
          }
        });
      }

      // レスポンス全体を保存
      console.log('\n  【レスポンス全体（JSON）】\n');
      console.log(`    ${JSON.stringify(crewsData, null, 2).split('\n').join('\n    ')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('DW API調査完了');
    console.log('='.repeat(80) + '\n');

    console.log('【まとめ】');
    console.log('  DW本体の現場詳細画面に表示される3つの枠:');
    console.log('    1. 現場管理担当者 → sites.manager.{admin, sub_admin1, sub_admin2, sub_admin3}');
    console.log('    2. 役割担当者     → site_crews API の casts[] 配列');
    console.log('    3. 参加ユーザー   → site_crews API の workers[] 配列');
    console.log('\n  40824がどこに含まれているかを上記の🎯マークで確認してください。');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkDWAPI();
