import { withSshMysql } from '../lib/db/sshMysql';

async function investigateManagers() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - v_managers詳細調査 & 現場567377の管理担当者特定');
    console.log('='.repeat(80) + '\n');

    // 1. v_managersビューの定義を確認
    console.log('【1. v_managersビューの定義】\n');

    try {
      const viewDef = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SHOW CREATE VIEW v_managers");
        return rows;
      });

      // @ts-ignore
      if (viewDef && viewDef[0]) {
        // @ts-ignore
        const createView = viewDef[0]['Create View'];
        console.log('  ビュー定義:\n');
        console.log(createView);
        console.log('');
      }
    } catch (error) {
      console.log('  ⚠️  ビュー定義を取得できませんでした');
    }

    // 2. 現場567377のv_managersレコードを詳細表示
    console.log('【2. 現場567377の管理者情報（v_managers）】\n');

    const managersData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM v_managers WHERE site_id = 567377");
      return rows;
    });

    if (!Array.isArray(managersData) || managersData.length === 0) {
      console.log('  ❌ v_managersに現場567377のレコードが見つかりませんでした');
    } else {
      console.log(`  ✅ ${managersData.length}件の管理者が見つかりました\n`);

      // @ts-ignore
      managersData.forEach((row: any, index: number) => {
        console.log(`  --- 管理者 ${index + 1} ---`);
        console.log(`     crew_id     : ${row.crew_id}`);
        console.log(`     site_id     : ${row.site_id}`);
        console.log(`     admin_level : ${row.admin_level} (${getAdminLevelName(row.admin_level)})`);
        console.log('');
      });
    }

    // 3. 各管理者のユーザー情報を取得
    console.log('【3. 各管理者のユーザー情報】\n');

    // @ts-ignore
    for (const manager of managersData) {
      const crewId = manager.crew_id;
      const adminLevel = manager.admin_level;

      console.log(`  --- crew_id: ${crewId} (admin_level: ${adminLevel} - ${getAdminLevelName(adminLevel)}) ---`);

      // usersテーブルから取得
      const userData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT id, username, created FROM users WHERE id = ?", [crewId]);
        return rows;
      });

      if (!Array.isArray(userData) || userData.length === 0) {
        console.log('     ⚠️  usersテーブルにid=' + crewId + 'が見つかりませんでした');
      } else {
        // @ts-ignore
        const user = userData[0];
        console.log(`     ✅ ユーザー情報:`);
        console.log(`        ID       : ${user.id}`);
        console.log(`        Username : ${user.username}`);
        console.log(`        作成日   : ${new Date(user.created).toLocaleDateString('ja-JP')}`);
      }

      // profilesテーブルから名前を取得
      const profileData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT user_id, name, furigana FROM profiles WHERE user_id = ?", [crewId]);
        return rows;
      });

      if (!Array.isArray(profileData) || profileData.length === 0) {
        console.log('     ⚠️  profilesテーブルにuser_id=' + crewId + 'が見つかりませんでした');
      } else {
        // @ts-ignore
        const profile = profileData[0];
        console.log(`     ✅ プロフィール情報:`);
        console.log(`        名前     : ${profile.name || 'NULL'}`);
        console.log(`        ふりがな : ${profile.furigana || 'NULL'}`);
      }

      console.log('');
    }

    // 4. user_id=40824の情報を再確認
    console.log('【4. user_id=40824（小坂井優）の情報】\n');

    const targetUserData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT id, username, created FROM users WHERE id = 40824");
      return rows;
    });

    if (!Array.isArray(targetUserData) || targetUserData.length === 0) {
      console.log('  ❌ user_id=40824が見つかりませんでした');
    } else {
      // @ts-ignore
      const user = targetUserData[0];
      console.log('  ✅ ユーザー情報:');
      console.log(`     ID       : ${user.id}`);
      console.log(`     Username : ${user.username}`);
      console.log(`     作成日   : ${new Date(user.created).toLocaleDateString('ja-JP')}`);

      const targetProfileData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT user_id, name, furigana FROM profiles WHERE user_id = 40824");
        return rows;
      });

      if (!Array.isArray(targetProfileData) || targetProfileData.length === 0) {
        console.log('  ⚠️  profilesテーブルにuser_id=40824が見つかりませんでした');
      } else {
        // @ts-ignore
        const profile = targetProfileData[0];
        console.log('  ✅ プロフィール情報:');
        console.log(`     名前     : ${profile.name || 'NULL'}`);
        console.log(`     ふりがな : ${profile.furigana || 'NULL'}`);
      }
    }

    // 5. user_id=40824が管理者として登録されている現場を検索
    console.log('\n【5. user_id=40824が管理者として登録されている現場】\n');

    const userSites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT site_id, admin_level
        FROM v_managers
        WHERE crew_id = 40824
        ORDER BY site_id DESC
        LIMIT 10
      `);
      return rows;
    });

    if (!Array.isArray(userSites) || userSites.length === 0) {
      console.log('  ❌ user_id=40824が管理者として登録されている現場は見つかりませんでした');
    } else {
      console.log(`  ✅ ${userSites.length}件の現場で管理者として登録されています\n`);

      // @ts-ignore
      userSites.forEach((row: any, index: number) => {
        const highlight = row.site_id === 567377 ? '⭐' : '  ';
        console.log(`  ${highlight} ${(index + 1).toString().padStart(2, ' ')}. site_id: ${row.site_id.toString().padStart(8, ' ')} | admin_level: ${row.admin_level} (${getAdminLevelName(row.admin_level)})`);
      });

      // @ts-ignore
      const targetSite = userSites.find((row: any) => row.site_id === 567377);
      if (targetSite) {
        console.log('\n  ✅ 小坂井優（user_id=40824）は現場567377の管理者として登録されています');
        console.log(`     admin_level: ${targetSite.admin_level} (${getAdminLevelName(targetSite.admin_level)})`);
      } else {
        console.log('\n  ❌ 小坂井優（user_id=40824）は現場567377の管理者として登録されていません');
      }
    }

    // 6. admin_levelの意味を調査
    console.log('\n【6. admin_levelの値の分布】\n');

    const adminLevelStats = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT admin_level, COUNT(*) as count
        FROM v_managers
        GROUP BY admin_level
        ORDER BY admin_level
      `);
      return rows;
    });

    console.log('  admin_level | 件数        | 推測される役割');
    console.log('  ------------|-------------|------------------');
    // @ts-ignore
    adminLevelStats.forEach((row: any) => {
      const count = row.count.toString().padStart(11, ' ');
      const level = row.admin_level.toString().padStart(11, ' ');
      console.log(`  ${level} | ${count} | ${getAdminLevelName(row.admin_level)}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ v_managers詳細調査が完了しました');
    console.log('='.repeat(80) + '\n');

    // 7. まとめ
    console.log('【まとめ】\n');
    console.log('  📋 現場管理担当者のデータは「v_managers」ビューに保存されています');
    console.log('  📋 テーブル構造:');
    console.log('     - crew_id     : ユーザーID (usersテーブルのid)');
    console.log('     - site_id     : 現場ID (sitesテーブルのid)');
    console.log('     - admin_level : 管理レベル (0=主管理者, 1=副管理者1, 2=副管理者2, 3=副管理者3)');
    console.log('');
    console.log('  📋 現場567377の管理担当者:');
    // @ts-ignore
    managersData.forEach((row: any, index: number) => {
      console.log(`     ${index + 1}. crew_id: ${row.crew_id} (admin_level: ${row.admin_level} - ${getAdminLevelName(row.admin_level)})`);
    });
    console.log('');
    console.log('  📋 ユーザー名を取得するには:');
    console.log('     SELECT v.crew_id, v.admin_level, p.name');
    console.log('     FROM v_managers v');
    console.log('     LEFT JOIN profiles p ON v.crew_id = p.user_id');
    console.log('     WHERE v.site_id = 567377;');
    console.log('');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  }
}

function getAdminLevelName(level: string | number): string {
  switch (level.toString()) {
    case '0': return '主管理者';
    case '1': return '副管理者1';
    case '2': return '副管理者2';
    case '3': return '副管理者3';
    default: return '不明';
  }
}

investigateManagers();
