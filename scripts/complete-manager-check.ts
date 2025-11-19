import { withSshMysql } from '../lib/db/sshMysql';

async function completeManagerCheck() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - 完全版: 現場567377の管理担当者');
    console.log('='.repeat(80) + '\n');

    // 1. 現場567377のcontractsレコードを取得
    console.log('【1. 現場567377のcontractsレコード】\n');

    const contractData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          site_id,
          admin,
          sub_admin1,
          sub_admin2,
          sub_admin3,
          sub_admin4,
          sub_admin5
        FROM contracts
        WHERE site_id = 567377
      `);
      return rows;
    });

    if (!Array.isArray(contractData) || contractData.length === 0) {
      console.log('  ❌ contractsテーブルにsite_id=567377のレコードが見つかりませんでした');
      return;
    }

    // @ts-ignore
    const contract = contractData[0];
    console.log('  ✅ contractsレコード:\n');
    console.log(`     site_id     : ${contract.site_id}`);
    console.log(`     admin       : ${contract.admin || 'NULL'} (主管理者)`);
    console.log(`     sub_admin1  : ${contract.sub_admin1 || 'NULL'} (副管理者1)`);
    console.log(`     sub_admin2  : ${contract.sub_admin2 || 'NULL'} (副管理者2)`);
    console.log(`     sub_admin3  : ${contract.sub_admin3 || 'NULL'} (副管理者3)`);
    console.log(`     sub_admin4  : ${contract.sub_admin4 || 'NULL'} (副管理者4)`);
    console.log(`     sub_admin5  : ${contract.sub_admin5 || 'NULL'} (副管理者5)`);

    // 管理者ID一覧
    const adminList = [
      { level: '主管理者', id: contract.admin },
      { level: '副管理者1', id: contract.sub_admin1 },
      { level: '副管理者2', id: contract.sub_admin2 },
      { level: '副管理者3', id: contract.sub_admin3 },
      { level: '副管理者4', id: contract.sub_admin4 },
      { level: '副管理者5', id: contract.sub_admin5 }
    ].filter(item => item.id !== null);

    console.log('\n  管理者ID一覧:', adminList.map(item => item.id));

    // user_id=40824が含まれているか確認
    const has40824 = adminList.some(item => item.id === 40824);
    if (has40824) {
      console.log('\n  ✅ user_id=40824が管理者として登録されています');
      const role = adminList.find(item => item.id === 40824);
      console.log(`     役割: ${role?.level}`);
    } else {
      console.log('\n  ❌ user_id=40824は管理者として登録されていません');
    }

    // 2. 各管理者の詳細情報を取得
    console.log('\n【2. 各管理者の詳細情報】\n');

    for (const admin of adminList) {
      console.log(`  --- ${admin.level} (user_id: ${admin.id}) ---`);

      // usersテーブルから取得
      const userData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT id, username, created FROM users WHERE id = ?", [admin.id]);
        return rows;
      });

      if (!Array.isArray(userData) || userData.length === 0) {
        console.log('     ⚠️  usersテーブルにレコードが見つかりませんでした');
      } else {
        // @ts-ignore
        const user = userData[0];
        console.log(`     ✅ ユーザー情報:`);
        console.log(`        username : ${user.username}`);
        console.log(`        作成日   : ${new Date(user.created).toLocaleDateString('ja-JP')}`);
      }

      // profilesテーブルから名前を取得
      const profileData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`
          SELECT
            user_id,
            user_first_name,
            user_last_name,
            user_tel1,
            user_tel2,
            user_tel3
          FROM profiles
          WHERE user_id = ?
        `, [admin.id]);
        return rows;
      });

      if (!Array.isArray(profileData) || profileData.length === 0) {
        console.log('     ⚠️  profilesテーブルにレコードが見つかりませんでした');
      } else {
        // @ts-ignore
        const profile = profileData[0];
        const fullName = `${profile.user_last_name || ''} ${profile.user_first_name || ''}`.trim();
        const tel = [profile.user_tel1, profile.user_tel2, profile.user_tel3].filter(t => t).join('-');
        console.log(`     ✅ プロフィール情報:`);
        console.log(`        名前     : ${fullName || 'NULL'}`);
        console.log(`        電話番号 : ${tel || 'NULL'}`);
      }

      console.log('');
    }

    // 3. v_managersビューからの取得も確認
    console.log('【3. v_managersビューからの確認】\n');

    const managersData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          v.crew_id,
          v.admin_level,
          u.username,
          CONCAT(p.user_last_name, ' ', p.user_first_name) as fullname
        FROM v_managers v
        LEFT JOIN users u ON v.crew_id = u.id
        LEFT JOIN profiles p ON v.crew_id = p.user_id
        WHERE v.site_id = 567377
        ORDER BY v.admin_level
      `);
      return rows;
    });

    console.log(`  ✅ ${managersData.length}件の管理者が見つかりました\n`);

    // @ts-ignore
    managersData.forEach((row: any, index: number) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${getAdminLevelName(row.admin_level).padEnd(10, ' ')} : crew_id=${row.crew_id.toString().padStart(8, ' ')} | ${row.fullname || 'NULL'} | ${row.username || 'NULL'}`);
    });

    // 4. user_id=40824の管理状況を確認
    console.log('\n【4. user_id=40824の管理現場一覧】\n');

    const user40824Data = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          u.id,
          u.username,
          CONCAT(p.user_last_name, ' ', p.user_first_name) as fullname
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = 40824
      `);
      return rows;
    });

    if (Array.isArray(user40824Data) && user40824Data.length > 0) {
      // @ts-ignore
      const user = user40824Data[0];
      console.log('  ✅ ユーザー情報:');
      console.log(`     user_id  : ${user.id}`);
      console.log(`     username : ${user.username}`);
      console.log(`     名前     : ${user.fullname || 'NULL'}`);
    }

    const user40824Sites = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          v.site_id,
          v.admin_level,
          s.name as site_name
        FROM v_managers v
        LEFT JOIN sites s ON v.site_id = s.id
        WHERE v.crew_id = 40824
        ORDER BY v.site_id DESC
        LIMIT 10
      `);
      return rows;
    });

    if (!Array.isArray(user40824Sites) || user40824Sites.length === 0) {
      console.log('\n  ❌ user_id=40824が管理者として登録されている現場は見つかりませんでした');
    } else {
      console.log(`\n  ✅ user_id=40824が管理者として登録されている現場: ${user40824Sites.length}件\n`);

      // @ts-ignore
      user40824Sites.forEach((row: any, index: number) => {
        const highlight = row.site_id === 567377 ? '⭐' : '  ';
        const levelName = getAdminLevelName(row.admin_level);
        console.log(`  ${highlight} ${(index + 1).toString().padStart(2, ' ')}. site_id: ${row.site_id.toString().padStart(8, ' ')} | ${levelName.padEnd(10, ' ')} | 現場名: ${row.site_name || 'NULL'}`);
      });

      // @ts-ignore
      const targetSite = user40824Sites.find((row: any) => row.site_id === 567377);
      if (targetSite) {
        console.log('\n  ✅ 小坂井優（user_id=40824）は現場567377の管理者です');
        console.log(`     役割: ${getAdminLevelName(targetSite.admin_level)}`);
      } else {
        console.log('\n  ❌ 小坂井優（user_id=40824）は現場567377の管理者ではありません');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 完全版確認が完了しました');
    console.log('='.repeat(80) + '\n');

    // 5. まとめ
    console.log('【まとめ】\n');
    console.log('  📊 現場管理担当者のデータ保存先:\n');
    console.log('     ✅ テーブル名: contracts');
    console.log('     ✅ カラム:');
    console.log('        - admin       : 主管理者のユーザーID (int)');
    console.log('        - sub_admin1  : 副管理者1のユーザーID (int)');
    console.log('        - sub_admin2  : 副管理者2のユーザーID (int)');
    console.log('        - sub_admin3  : 副管理者3のユーザーID (int)');
    console.log('        - sub_admin4  : 副管理者4のユーザーID (int)');
    console.log('        - sub_admin5  : 副管理者5のユーザーID (int)');
    console.log('');
    console.log('     ✅ ビュー名: v_managers');
    console.log('        - contractsテーブルをUNION ALLで展開');
    console.log('        - カラム: crew_id, site_id, admin_level');
    console.log('        - admin_level: 0=主管理者, 1=副管理者1, 2=副管理者2, ...');
    console.log('');
    console.log('  📊 ユーザー名の取得方法:\n');
    console.log('     SELECT');
    console.log('       v.crew_id,');
    console.log('       v.admin_level,');
    console.log('       CONCAT(p.user_last_name, \' \', p.user_first_name) as fullname');
    console.log('     FROM v_managers v');
    console.log('     LEFT JOIN profiles p ON v.crew_id = p.user_id');
    console.log('     WHERE v.site_id = ?;');
    console.log('');
    console.log('  📊 現場567377の管理担当者:\n');
    if (Array.isArray(managersData) && managersData.length > 0) {
      // @ts-ignore
      managersData.forEach((row: any, index: number) => {
        console.log(`     ${(index + 1).toString().padStart(2, ' ')}. ${getAdminLevelName(row.admin_level).padEnd(10, ' ')} : crew_id=${row.crew_id.toString().padStart(8, ' ')} (${row.fullname || 'NULL'})`);
      });
    }
    console.log('');
    console.log('  📊 user_id=40824の登録状況:');
    console.log(`     ${has40824 ? '✅ 現場567377の管理者として登録されています' : '❌ 現場567377の管理者ではありません'}`);
    if (has40824) {
      const role = adminList.find(item => item.id === 40824);
      console.log(`     役割: ${role?.level}`);
    }
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
    case '4': return '副管理者4';
    case '5': return '副管理者5';
    default: return '不明';
  }
}

completeManagerCheck();
