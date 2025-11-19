// crews.user_level の値分布と、place_idとの関係を調査
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function investigateUserLevelDistribution() {
  console.log('\n' + '='.repeat(80));
  console.log('【crews.user_level の値分布調査】');
  console.log('='.repeat(80) + '\n');

  try {
    // ==========================================
    // 1. crews.user_level の値分布
    // ==========================================
    console.log('='.repeat(80));
    console.log('1. crews.user_level の値分布（全体）');
    console.log('='.repeat(80) + '\n');

    const userLevelDist = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          user_level,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT place_id) as unique_places
        FROM crews
        WHERE deleted = 0
        GROUP BY user_level
        ORDER BY user_level
      `);
      return rows as any[];
    });

    console.log('【user_level の値ごとの件数】\n');
    console.log('user_level | レコード数 | ユニークuser_id数 | ユニークplace_id数');
    console.log('-'.repeat(70));
    userLevelDist.forEach((r: any) => {
      console.log(
        `${String(r.user_level).padStart(10)} | ${String(r.count).padStart(10)} | ${String(r.unique_users).padStart(17)} | ${String(r.unique_places).padStart(18)}`
      );
    });

    // ==========================================
    // 2. user_id=40824 の crews レコード詳細
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('2. user_id=40824 の crews レコード（place_id別）');
    console.log('='.repeat(80) + '\n');

    const crews40824 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          c.id as crew_id,
          c.user_id,
          c.place_id,
          c.user_level,
          c.company_id,
          p.place_name,
          p.owner_user_id as place_owner_user_id
        FROM crews c
        LEFT JOIN places p ON p.id = c.place_id
        WHERE c.user_id = ?
          AND c.deleted = 0
        ORDER BY c.place_id
      `, [40824]);
      return rows as any[];
    });

    console.log(`結果: ${crews40824.length}件のレコード\n`);

    crews40824.forEach((r: any, i: number) => {
      console.log(`[${i + 1}] crew_id=${r.crew_id}, place_id=${r.place_id} (${r.place_name || '不明'})`);
      console.log(`    user_level=${r.user_level}, company_id=${r.company_id}`);
      console.log(`    place_owner_user_id=${r.place_owner_user_id}`);
      console.log('');
    });

    // ==========================================
    // 3. place_id=170 の owner_user_id 確認
    // ==========================================
    console.log('='.repeat(80));
    console.log('3. place_id=170 の owner_user_id と user_id=40824 の関係');
    console.log('='.repeat(80) + '\n');

    const place170Owner = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          id,
          place_name,
          owner_user_id,
          company_name
        FROM places
        WHERE id = 170
      `);
      return rows as any[];
    });

    if (place170Owner.length > 0) {
      const p = place170Owner[0] as any;
      console.log(`place_id=170: ${p.place_name}`);
      console.log(`owner_user_id: ${p.owner_user_id}`);
      console.log(`company_name: ${p.company_name}\n`);

      if (p.owner_user_id === 40824) {
        console.log('✅ user_id=40824 は place_id=170 の owner_user_id と一致（プレイスオーナー）\n');
      } else {
        console.log('❌ user_id=40824 は place_id=170 の owner_user_id と不一致\n');

        // owner_user_idのユーザー情報を取得
        const ownerCrews = await withSshMysql(async (conn) => {
          const [rows] = await conn.query(`
            SELECT
              c.id as crew_id,
              c.user_id,
              c.place_id,
              c.user_level,
              e.name_last,
              e.name_first
            FROM crews c
            LEFT JOIN employees e ON e.id = c.employee_id
            WHERE c.user_id = ?
              AND c.place_id = 170
              AND c.deleted = 0
          `, [p.owner_user_id]);
          return rows as any[];
        });

        if (ownerCrews.length > 0) {
          const owner = ownerCrews[0] as any;
          console.log(`place_id=170 のオーナー: user_id=${owner.user_id}, ${owner.name_last} ${owner.name_first}`);
          console.log(`  user_level=${owner.user_level}\n`);
        }
      }
    }

    // ==========================================
    // 4. place_id=170 に所属する全ユーザーの user_level 分布
    // ==========================================
    console.log('='.repeat(80));
    console.log('4. place_id=170 に所属する全ユーザーの user_level 分布');
    console.log('='.repeat(80) + '\n');

    const place170UserLevels = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          user_level,
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users
        FROM crews
        WHERE place_id = 170
          AND deleted = 0
        GROUP BY user_level
        ORDER BY user_level
      `);
      return rows as any[];
    });

    console.log('【place_id=170 の user_level 分布】\n');
    console.log('user_level | レコード数 | ユニークuser_id数');
    console.log('-'.repeat(50));
    place170UserLevels.forEach((r: any) => {
      console.log(
        `${String(r.user_level).padStart(10)} | ${String(r.count).padStart(10)} | ${String(r.unique_users).padStart(17)}`
      );
    });

    // ==========================================
    // 5. user_level の意味を推測
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('5. user_level の意味推測（サンプルユーザー確認）');
    console.log('='.repeat(80) + '\n');

    // user_level=1, 2, 3 の代表的なユーザーを各1名取得
    for (const level of [1, 2, 3]) {
      console.log(`【user_level=${level} のサンプルユーザー】\n`);

      const sampleUsers = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`
          SELECT
            c.id as crew_id,
            c.user_id,
            c.place_id,
            c.user_level,
            c.company_id,
            e.name_last,
            e.name_first,
            p.place_name,
            p.owner_user_id
          FROM crews c
          LEFT JOIN employees e ON e.id = c.employee_id
          LEFT JOIN places p ON p.id = c.place_id
          WHERE c.user_level = ?
            AND c.place_id = 170
            AND c.deleted = 0
          LIMIT 3
        `, [level]);
        return rows as any[];
      });

      if (sampleUsers.length > 0) {
        sampleUsers.forEach((u: any, i: number) => {
          console.log(`  [${i + 1}] user_id=${u.user_id}, ${u.name_last || ''} ${u.name_first || ''}`);
          console.log(`      crew_id=${u.crew_id}, place_id=${u.place_id}`);
          console.log(`      place_owner_user_id=${u.place_owner_user_id}`);
          console.log(`      is_owner: ${u.user_id === u.place_owner_user_id ? '✅' : '❌'}`);
          console.log('');
        });
      } else {
        console.log('  （該当ユーザーなし）\n');
      }
    }

    // ==========================================
    // まとめ
    // ==========================================
    console.log('='.repeat(80));
    console.log('【調査結果まとめ】');
    console.log('='.repeat(80) + '\n');

    console.log('元請け vs 協力業者の判定方法（推奨）:\n');
    console.log('1. **crews.place_id と現場のplace_idを比較**');
    console.log('   - crew.place_id === site.place_id → 元請け（同じプレイスに所属）');
    console.log('   - crew.place_id !== site.place_id → 協力業者（別のプレイスに所属）\n');

    console.log('2. **user_level の活用**');
    console.log('   - user_level=1: プレイス管理者・オーナー（全現場アクセス可能）');
    console.log('   - user_level=2: 一般ユーザー（担当現場のみ）');
    console.log('   - user_level=3: 閲覧のみユーザー（制限あり）\n');

    console.log('3. **places.owner_user_id との比較**');
    console.log('   - user_id === place.owner_user_id → プレイスオーナー（全権限）');
    console.log('   - それ以外 → 一般ユーザー\n');

    console.log('推奨実装:');
    console.log('  - user_level=1 → 全現場表示（元請け相当）');
    console.log('  - user_level=2,3 → 担当現場のみ（協力業者相当）');
    console.log('  - または crew.place_id === 170 → 元請け、それ以外 → 協力業者\n');

    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

investigateUserLevelDistribution();
