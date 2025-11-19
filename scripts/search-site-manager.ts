import { withSshMysql } from '../lib/db/sshMysql';

async function searchSiteManager() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - 現場管理担当者データ検索');
    console.log('='.repeat(80) + '\n');

    // 1. manager、admin、担当に関連するテーブルを検索
    console.log('【1. 関連テーブル検索】\n');

    const managerTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW TABLES LIKE '%manager%'");
      return rows;
    });

    const adminTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW TABLES LIKE '%admin%'");
      return rows;
    });

    const siteTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW TABLES LIKE '%site%'");
      return rows;
    });

    console.log('  📁 "manager"を含むテーブル:');
    // @ts-ignore
    managerTables.forEach((row: any) => {
      const tableName = Object.values(row)[0];
      console.log(`     - ${tableName}`);
    });

    console.log('\n  📁 "admin"を含むテーブル:');
    // @ts-ignore
    adminTables.forEach((row: any) => {
      const tableName = Object.values(row)[0];
      console.log(`     - ${tableName}`);
    });

    console.log('\n  📁 "site"を含むテーブル:');
    // @ts-ignore
    siteTables.forEach((row: any) => {
      const tableName = Object.values(row)[0];
      console.log(`     - ${tableName}`);
    });

    // 2. sitesテーブルの構造を確認
    console.log('\n【2. sitesテーブルの構造】\n');

    const sitesColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM sites");
      return rows;
    });

    // @ts-ignore
    sitesColumns.forEach((column: any, index: number) => {
      const nullInfo = column.Null === 'YES' ? 'NULL可' : '必須';
      const field = column.Field.toLowerCase();
      const isRelevant = field.includes('admin') || field.includes('manager') || field.includes('担当');
      const mark = isRelevant ? '⭐' : '  ';
      console.log(`  ${mark} ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type.padEnd(20, ' ')} [${nullInfo}]`);
    });

    // 3. site_id=567377のレコードを取得
    console.log('\n【3. 現場567377のデータ】\n');

    const siteData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM sites WHERE id = 567377");
      return rows;
    });

    if (!Array.isArray(siteData) || siteData.length === 0) {
      console.log('  ❌ 現場567377が見つかりませんでした');
    } else {
      // @ts-ignore
      const site = siteData[0];
      console.log('  ✅ 現場が見つかりました\n');

      // 管理者関連のカラムを抽出
      const relevantColumns = Object.keys(site).filter(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('admin') || lowerKey.includes('manager') || lowerKey.includes('担当');
      });

      console.log('  管理者関連カラム:');
      relevantColumns.forEach(key => {
        const value = site[key];
        console.log(`     ${key.padEnd(30, ' ')} : ${value === null ? 'NULL' : value}`);
      });

      // 全カラムを表示（デバッグ用）
      console.log('\n  全カラム一覧:');
      Object.keys(site).forEach(key => {
        const value = site[key];
        const displayValue = value === null ? 'NULL' :
                           typeof value === 'object' ? JSON.stringify(value) :
                           value.toString();
        console.log(`     ${key.padEnd(30, ' ')} : ${displayValue.substring(0, 100)}`);
      });
    }

    // 4. user_id=40824のユーザー情報を確認
    console.log('\n【4. ユーザー40824の情報】\n');

    const userData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM users WHERE id = 40824");
      return rows;
    });

    if (!Array.isArray(userData) || userData.length === 0) {
      console.log('  ⚠️  usersテーブルにid=40824のレコードが見つかりませんでした');

      // user_codeで検索してみる
      const userDataByCode = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT * FROM users WHERE user_code = '40824' LIMIT 1");
        return rows;
      });

      if (Array.isArray(userDataByCode) && userDataByCode.length > 0) {
        // @ts-ignore
        const user = userDataByCode[0];
        console.log('  ✅ user_code="40824"で見つかりました\n');
        Object.keys(user).forEach(key => {
          const value = user[key];
          const displayValue = value === null ? 'NULL' : value.toString();
          console.log(`     ${key.padEnd(30, ' ')} : ${displayValue}`);
        });
      }
    } else {
      // @ts-ignore
      const user = userData[0];
      console.log('  ✅ ユーザーが見つかりました\n');
      Object.keys(user).forEach(key => {
        const value = user[key];
        const displayValue = value === null ? 'NULL' : value.toString();
        console.log(`     ${key.padEnd(30, ' ')} : ${displayValue}`);
      });
    }

    // 5. sites_crewsテーブルで関連を確認
    console.log('\n【5. sites_crewsテーブルでの関連】\n');

    const siteCrewData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT * FROM sites_crews
        WHERE site_id = 567377 AND deleted = 0
        ORDER BY user_level
      `);
      return rows;
    });

    if (!Array.isArray(siteCrewData) || siteCrewData.length === 0) {
      console.log('  ❌ site_id=567377に紐づくユーザーが見つかりませんでした');
    } else {
      console.log(`  ✅ ${siteCrewData.length}件のユーザーが見つかりました\n`);

      // @ts-ignore
      siteCrewData.forEach((row: any, index: number) => {
        const highlight = row.crew_id === 40824 ? '⭐' : '  ';
        console.log(`  ${highlight} ${(index + 1).toString().padStart(2, ' ')}. crew_id: ${row.crew_id.toString().padStart(8, ' ')} | user_level: ${row.user_level} | 作成日: ${new Date(row.created).toLocaleDateString('ja-JP')}`);
      });

      // user_id=40824が含まれているか確認
      // @ts-ignore
      const targetUser = siteCrewData.find((row: any) => row.crew_id === 40824);
      if (targetUser) {
        console.log('\n  ✅ 小坂井優（user_id=40824）が管理担当者として登録されています');
        console.log(`     user_level: ${targetUser.user_level}`);
      } else {
        console.log('\n  ❌ 小坂井優（user_id=40824）は登録されていません');
      }
    }

    // 6. site_adminsテーブルが存在するか確認
    console.log('\n【6. site_adminsテーブルの確認】\n');

    try {
      const siteAdminsExists = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SHOW TABLES LIKE 'site_admins'");
        return rows;
      });

      if (Array.isArray(siteAdminsExists) && siteAdminsExists.length > 0) {
        console.log('  ✅ site_adminsテーブルが存在します\n');

        const siteAdminsColumns = await withSshMysql(async (conn) => {
          const [rows] = await conn.query("SHOW COLUMNS FROM site_admins");
          return rows;
        });

        console.log('  テーブル構造:');
        // @ts-ignore
        siteAdminsColumns.forEach((column: any, index: number) => {
          console.log(`     ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type}`);
        });

        const siteAdminsData = await withSshMysql(async (conn) => {
          const [rows] = await conn.query("SELECT * FROM site_admins WHERE site_id = 567377");
          return rows;
        });

        if (Array.isArray(siteAdminsData) && siteAdminsData.length > 0) {
          console.log('\n  現場567377のsite_adminsレコード:');
          // @ts-ignore
          siteAdminsData.forEach((row: any) => {
            Object.keys(row).forEach(key => {
              const value = row[key];
              console.log(`     ${key.padEnd(30, ' ')} : ${value === null ? 'NULL' : value}`);
            });
          });
        } else {
          console.log('\n  ⚠️  現場567377のsite_adminsレコードが見つかりませんでした');
        }
      } else {
        console.log('  ⚠️  site_adminsテーブルは存在しません');
      }
    } catch (error) {
      console.log('  ⚠️  site_adminsテーブルの確認中にエラーが発生しました');
    }

    // 7. site_managersテーブルが存在するか確認
    console.log('\n【7. site_managersテーブルの確認】\n');

    try {
      const siteManagersExists = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SHOW TABLES LIKE 'site_managers'");
        return rows;
      });

      if (Array.isArray(siteManagersExists) && siteManagersExists.length > 0) {
        console.log('  ✅ site_managersテーブルが存在します\n');

        const siteManagersColumns = await withSshMysql(async (conn) => {
          const [rows] = await conn.query("SHOW COLUMNS FROM site_managers");
          return rows;
        });

        console.log('  テーブル構造:');
        // @ts-ignore
        siteManagersColumns.forEach((column: any, index: number) => {
          console.log(`     ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type}`);
        });

        const siteManagersData = await withSshMysql(async (conn) => {
          const [rows] = await conn.query("SELECT * FROM site_managers WHERE site_id = 567377");
          return rows;
        });

        if (Array.isArray(siteManagersData) && siteManagersData.length > 0) {
          console.log('\n  現場567377のsite_managersレコード:');
          // @ts-ignore
          siteManagersData.forEach((row: any) => {
            Object.keys(row).forEach(key => {
              const value = row[key];
              console.log(`     ${key.padEnd(30, ' ')} : ${value === null ? 'NULL' : value}`);
            });
          });
        } else {
          console.log('\n  ⚠️  現場567377のsite_managersレコードが見つかりませんでした');
        }
      } else {
        console.log('  ⚠️  site_managersテーブルは存在しません');
      }
    } catch (error) {
      console.log('  ⚠️  site_managersテーブルの確認中にエラーが発生しました');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 現場管理担当者データの検索が完了しました');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  }
}

searchSiteManager();
