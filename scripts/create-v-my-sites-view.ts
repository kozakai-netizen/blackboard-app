// v_my_sitesビュー作成スクリプト
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function createViewMySites() {
  console.log('\n' + '='.repeat(80));
  console.log('【v_my_sitesビュー作成】user_idベースの担当現場ビュー');
  console.log('='.repeat(80) + '\n');

  try {
    // ビュー定義SQL
    const createViewSQL = `
CREATE OR REPLACE VIEW v_my_sites AS
SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'manager' AS relation_type
FROM sites s
JOIN v_managers vm ON vm.site_id = s.id
JOIN crews c ON c.id = vm.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND c.deleted = 0

UNION

SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'cast' AS relation_type
FROM sites s
JOIN site_casts sc ON sc.site_id = s.id
JOIN crews c ON c.id = sc.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND sc.deleted = 0
  AND c.deleted = 0

UNION

SELECT DISTINCT
  s.id AS site_id,
  c.user_id AS user_id,
  'crew' AS relation_type
FROM sites s
JOIN sites_crews scr ON scr.site_id = s.id
JOIN crews c ON c.id = scr.crew_id
WHERE s.place_id = 170
  AND s.deleted = 0
  AND scr.deleted = 0
  AND c.deleted = 0;
    `.trim();

    console.log('【ビュー定義SQL】\n');
    console.log(createViewSQL);
    console.log('\n');

    // ビュー作成実行
    console.log('【ビュー作成実行】\n');
    await withSshMysql(async (conn) => {
      await conn.query(createViewSQL);
    });

    console.log('✅ v_my_sitesビューの作成に成功しました\n');

    // 検証: user_id=40824 の担当現場を取得
    console.log('='.repeat(80));
    console.log('【検証】user_id=40824 の担当現場一覧');
    console.log('='.repeat(80) + '\n');

    console.log('SQL:');
    console.log('  SELECT * FROM v_my_sites WHERE user_id = 40824 ORDER BY site_id;\n');

    const mySites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM v_my_sites WHERE user_id = ? ORDER BY site_id LIMIT 20',
        [40824]
      );
      return rows as any[];
    });

    console.log(`結果: ${mySites.length}件のレコード（最初の20件）\n`);

    if (mySites.length > 0) {
      mySites.forEach((r: any, i: number) => {
        console.log(`  [${i + 1}] site_id=${r.site_id}, user_id=${r.user_id}, relation_type=${r.relation_type}`);
      });

      // site_id=567377 が含まれているか確認
      const site567377 = mySites.find((r: any) => r.site_id === 567377);
      if (site567377) {
        console.log(`\n  🎯 site_id=567377 が含まれています！`);
        console.log(`     relation_type: ${site567377.relation_type}`);
      } else {
        console.log(`\n  ⚠️  site_id=567377 は最初の20件には含まれていません`);
        console.log(`     （全${mySites.length}件以上の可能性）`);

        // 567377 を直接検索
        console.log('\n  567377を直接検索します...');
        const site567377Direct = await withSshMysql(async (conn) => {
          const [rows] = await conn.query(
            'SELECT * FROM v_my_sites WHERE user_id = ? AND site_id = ?',
            [40824, 567377]
          );
          return rows as any[];
        });

        if (site567377Direct.length > 0) {
          console.log(`\n  ✅ site_id=567377 が見つかりました！`);
          site567377Direct.forEach((r: any, i: number) => {
            console.log(`    [${i + 1}] relation_type=${r.relation_type}`);
          });
        } else {
          console.log(`\n  ❌ site_id=567377 が見つかりませんでした`);
        }
      }
    } else {
      console.log('  ❌ レコードが見つかりませんでした');
    }

    // 全体統計
    console.log('\n' + '='.repeat(80));
    console.log('【ビュー統計】');
    console.log('='.repeat(80) + '\n');

    const stats = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT site_id) as unique_sites,
          COUNT(DISTINCT user_id) as unique_users,
          relation_type,
          COUNT(*) as count_by_type
        FROM v_my_sites
        GROUP BY relation_type
      `);
      return rows as any[];
    });

    console.log('全体統計:\n');
    stats.forEach((s: any) => {
      console.log(`  ${s.relation_type.padEnd(10)}: ${s.count_by_type.toString().padStart(6)}件`);
    });

    const totalStats = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          COUNT(*) as total_records,
          COUNT(DISTINCT site_id) as unique_sites,
          COUNT(DISTINCT user_id) as unique_users
        FROM v_my_sites
      `);
      return rows as any[];
    });

    const total = totalStats[0] as any;
    console.log('\n合計:');
    console.log(`  総レコード数   : ${total.total_records.toLocaleString()}件`);
    console.log(`  ユニーク現場数 : ${total.unique_sites.toLocaleString()}件`);
    console.log(`  ユニークユーザー: ${total.unique_users.toLocaleString()}人`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ v_my_sitesビューの作成・検証が完了しました');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

createViewMySites();
