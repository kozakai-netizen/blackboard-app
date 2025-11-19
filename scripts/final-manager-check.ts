import { withSshMysql } from '../lib/db/sshMysql';

async function finalManagerCheck() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - 最終確認: 現場567377の管理担当者');
    console.log('='.repeat(80) + '\n');

    // 1. contractsテーブルの構造を確認
    console.log('【1. contractsテーブルの構造】\n');

    const contractsColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM contracts");
      return rows;
    });

    // @ts-ignore
    contractsColumns.forEach((column: any, index: number) => {
      const field = column.Field.toLowerCase();
      const isRelevant = field.includes('admin');
      const mark = isRelevant ? '⭐' : '  ';
      console.log(`  ${mark} ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type.padEnd(20, ' ')}`);
    });

    // 2. site_id=567377のcontractsレコードを取得
    console.log('\n【2. 現場567377のcontractsレコード】\n');

    const contractData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM contracts WHERE site_id = 567377");
      return rows;
    });

    if (!Array.isArray(contractData) || contractData.length === 0) {
      console.log('  ❌ 現場567377のcontractsレコードが見つかりませんでした');
    } else {
      // @ts-ignore
      const contract = contractData[0];
      console.log('  ✅ contractsレコードが見つかりました\n');

      // admin関連カラムを抽出
      const adminColumns = Object.keys(contract).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('admin');
      });

      console.log('  管理者関連カラム:');
      adminColumns.forEach(key => {
        const value = contract[key];
        console.log(`     ${key.padEnd(30, ' ')} : ${value === null ? 'NULL' : value}`);
      });
    }

    // 3. profilesテーブルの構造を確認
    console.log('\n【3. profilesテーブルの構造】\n');

    const profilesColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM profiles");
      return rows;
    });

    // @ts-ignore
    profilesColumns.forEach((column: any, index: number) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type.padEnd(20, ' ')}`);
    });

    // 4. 現場567377の管理者情報を詳細取得
    console.log('\n【4. 現場567377の管理者一覧（名前付き）】\n');

    const managersWithNames = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          v.crew_id,
          v.admin_level,
          u.username,
          p.fullname,
          p.furigana
        FROM v_managers v
        LEFT JOIN users u ON v.crew_id = u.id
        LEFT JOIN profiles p ON v.crew_id = p.user_id
        WHERE v.site_id = 567377
        ORDER BY v.admin_level
      `);
      return rows;
    });

    if (!Array.isArray(managersWithNames) || managersWithNames.length === 0) {
      console.log('  ❌ 管理者情報が取得できませんでした');
    } else {
      console.log(`  ✅ ${managersWithNames.length}件の管理者が見つかりました\n`);

      // @ts-ignore
      managersWithNames.forEach((row: any, index: number) => {
        console.log(`  --- 管理者 ${index + 1} ---`);
        console.log(`     crew_id     : ${row.crew_id}`);
        console.log(`     admin_level : ${row.admin_level} (${getAdminLevelName(row.admin_level)})`);
        console.log(`     username    : ${row.username || 'NULL'}`);
        console.log(`     fullname    : ${row.fullname || 'NULL'}`);
        console.log(`     furigana    : ${row.furigana || 'NULL'}`);
        console.log('');
      });
    }

    // 5. user_id=40824が管理者として登録されているか確認
    console.log('【5. user_id=40824（小坂井優）の管理者登録状況】\n');

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
      console.log('  ❌ user_id=40824が管理者として登録されている現場は見つかりませんでした');
    } else {
      console.log(`  ✅ user_id=40824が管理者として登録されている現場: ${user40824Sites.length}件\n`);

      // @ts-ignore
      user40824Sites.forEach((row: any, index: number) => {
        const highlight = row.site_id === 567377 ? '⭐' : '  ';
        console.log(`  ${highlight} ${(index + 1).toString().padStart(2, ' ')}. site_id: ${row.site_id.toString().padStart(8, ' ')} | admin_level: ${row.admin_level} | 現場名: ${row.site_name || 'NULL'}`);
      });

      // @ts-ignore
      const targetSite = user40824Sites.find((row: any) => row.site_id === 567377);
      if (targetSite) {
        console.log('\n  ✅ 小坂井優（user_id=40824）は現場567377の管理者です');
        console.log(`     admin_level: ${targetSite.admin_level} (${getAdminLevelName(targetSite.admin_level)})`);
      } else {
        console.log('\n  ❌ 小坂井優（user_id=40824）は現場567377の管理者ではありません');
      }
    }

    // 6. contractsテーブルで直接確認
    console.log('\n【6. contractsテーブルでの直接確認】\n');

    const contractCheck = await withSshMysql(async (conn) => {
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

    if (!Array.isArray(contractCheck) || contractCheck.length === 0) {
      console.log('  ❌ contractsテーブルにsite_id=567377のレコードが見つかりませんでした');
    } else {
      // @ts-ignore
      const contract = contractCheck[0];
      console.log('  ✅ contractsレコード:\n');
      console.log(`     site_id     : ${contract.site_id}`);
      console.log(`     admin       : ${contract.admin || 'NULL'} (主管理者)`);
      console.log(`     sub_admin1  : ${contract.sub_admin1 || 'NULL'} (副管理者1)`);
      console.log(`     sub_admin2  : ${contract.sub_admin2 || 'NULL'} (副管理者2)`);
      console.log(`     sub_admin3  : ${contract.sub_admin3 || 'NULL'} (副管理者3)`);
      console.log(`     sub_admin4  : ${contract.sub_admin4 || 'NULL'} (副管理者4)`);
      console.log(`     sub_admin5  : ${contract.sub_admin5 || 'NULL'} (副管理者5)`);

      // user_id=40824が含まれているか確認
      const adminIds = [
        contract.admin,
        contract.sub_admin1,
        contract.sub_admin2,
        contract.sub_admin3,
        contract.sub_admin4,
        contract.sub_admin5
      ].filter(id => id !== null);

      console.log('\n  管理者ID一覧:', adminIds);

      if (adminIds.includes(40824)) {
        console.log('\n  ✅ user_id=40824が管理者として登録されています');
      } else {
        console.log('\n  ❌ user_id=40824は管理者として登録されていません');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 最終確認が完了しました');
    console.log('='.repeat(80) + '\n');

    // 7. まとめ
    console.log('【まとめ】\n');
    console.log('  📋 現場管理担当者のデータ保存先:');
    console.log('     ✓ 実データ: contractsテーブル');
    console.log('       - admin       : 主管理者のユーザーID');
    console.log('       - sub_admin1  : 副管理者1のユーザーID');
    console.log('       - sub_admin2  : 副管理者2のユーザーID');
    console.log('       - sub_admin3  : 副管理者3のユーザーID');
    console.log('       - sub_admin4  : 副管理者4のユーザーID');
    console.log('       - sub_admin5  : 副管理者5のユーザーID');
    console.log('');
    console.log('     ✓ ビュー: v_managers');
    console.log('       - contractsテーブルのUNION ALL形式のビュー');
    console.log('       - crew_id, site_id, admin_levelの3カラム');
    console.log('');
    console.log('  📋 ユーザー名の取得方法:');
    console.log('     SELECT v.crew_id, v.admin_level, p.fullname');
    console.log('     FROM v_managers v');
    console.log('     LEFT JOIN profiles p ON v.crew_id = p.user_id');
    console.log('     WHERE v.site_id = ?;');
    console.log('');
    console.log('  📋 現場567377の管理者:');
    if (Array.isArray(managersWithNames) && managersWithNames.length > 0) {
      // @ts-ignore
      managersWithNames.forEach((row: any, index: number) => {
        console.log(`     ${index + 1}. ${getAdminLevelName(row.admin_level).padEnd(10, ' ')} : crew_id=${row.crew_id} (${row.fullname || 'NULL'})`);
      });
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

finalManagerCheck();
