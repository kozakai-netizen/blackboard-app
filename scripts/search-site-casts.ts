import { withSshMysql } from '../lib/db/sshMysql';

async function searchSiteCasts() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - site_casts & v_managersテーブル詳細調査');
    console.log('='.repeat(80) + '\n');

    // 1. site_castsテーブルの構造を確認
    console.log('【1. site_castsテーブルの構造】\n');

    const siteCastsColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM site_casts");
      return rows;
    });

    // @ts-ignore
    siteCastsColumns.forEach((column: any, index: number) => {
      const nullInfo = column.Null === 'YES' ? 'NULL可' : '必須';
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type.padEnd(20, ' ')} [${nullInfo}]`);
    });

    // 2. site_id=567377のsite_castsレコードを取得
    console.log('\n【2. 現場567377のsite_castsレコード】\n');

    const siteCastsData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM site_casts WHERE site_id = 567377 AND deleted = 0");
      return rows;
    });

    if (!Array.isArray(siteCastsData) || siteCastsData.length === 0) {
      console.log('  ❌ 現場567377のsite_castsレコードが見つかりませんでした');
    } else {
      console.log(`  ✅ ${siteCastsData.length}件のレコードが見つかりました\n`);

      // @ts-ignore
      siteCastsData.forEach((row: any, index: number) => {
        console.log(`  --- レコード ${index + 1} ---`);
        Object.keys(row).forEach(key => {
          const value = row[key];
          const displayValue = value === null ? 'NULL' :
                             typeof value === 'object' ? JSON.stringify(value) :
                             value.toString();
          const highlight = key.includes('cast') || key.includes('user') ? '⭐' : '  ';
          console.log(`  ${highlight} ${key.padEnd(30, ' ')} : ${displayValue}`);
        });
        console.log('');
      });
    }

    // 3. v_managersビューの構造を確認
    console.log('【3. v_managersビューの構造】\n');

    const vManagersColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM v_managers");
      return rows;
    });

    // @ts-ignore
    vManagersColumns.forEach((column: any, index: number) => {
      const nullInfo = column.Null === 'YES' ? 'NULL可' : '必須';
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(30, ' ')} : ${column.Type.padEnd(20, ' ')} [${nullInfo}]`);
    });

    // 4. v_managersビューからsite_id=567377のデータを取得
    console.log('\n【4. v_managersビューから現場567377のデータ】\n');

    const vManagersData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM v_managers WHERE site_id = 567377");
      return rows;
    });

    if (!Array.isArray(vManagersData) || vManagersData.length === 0) {
      console.log('  ❌ v_managersに現場567377のレコードが見つかりませんでした');
    } else {
      console.log(`  ✅ ${vManagersData.length}件のレコードが見つかりました\n`);

      // @ts-ignore
      vManagersData.forEach((row: any, index: number) => {
        console.log(`  --- レコード ${index + 1} ---`);
        Object.keys(row).forEach(key => {
          const value = row[key];
          const displayValue = value === null ? 'NULL' :
                             typeof value === 'object' ? JSON.stringify(value) :
                             value.toString();
          console.log(`     ${key.padEnd(30, ' ')} : ${displayValue}`);
        });
        console.log('');
      });
    }

    // 5. site_castsテーブルでcast=40824のレコードを検索
    console.log('【5. site_castsでcast=40824のレコードを検索】\n');

    const siteCastsByCast = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM site_casts WHERE cast = 40824 AND deleted = 0 LIMIT 10");
      return rows;
    });

    if (!Array.isArray(siteCastsByCast) || siteCastsByCast.length === 0) {
      console.log('  ❌ cast=40824のレコードが見つかりませんでした');
    } else {
      console.log(`  ✅ ${siteCastsByCast.length}件のレコードが見つかりました\n`);

      // @ts-ignore
      siteCastsByCast.forEach((row: any, index: number) => {
        console.log(`  ${(index + 1).toString().padStart(2, ' ')}. site_id: ${row.site_id.toString().padStart(8, ' ')} | cast: ${row.cast} | cast_name: ${row.cast_name || 'NULL'}`);
      });
    }

    // 6. site_castsの全レコードをサンプル表示（最新10件）
    console.log('\n【6. site_castsの最新10件（参考）】\n');

    const siteCastsSample = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM site_casts WHERE deleted = 0 ORDER BY id DESC LIMIT 10");
      return rows;
    });

    // @ts-ignore
    siteCastsSample.forEach((row: any, index: number) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. id: ${row.id.toString().padStart(8, ' ')} | site_id: ${row.site_id.toString().padStart(8, ' ')} | cast: ${row.cast} | cast_name: ${row.cast_name || 'NULL'}`);
    });

    // 7. castの種類を調査
    console.log('\n【7. site_castsのcast_name一覧（ユニーク）】\n');

    const castNames = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT DISTINCT cast_name FROM site_casts WHERE deleted = 0 AND cast_name IS NOT NULL ORDER BY cast_name");
      return rows;
    });

    // @ts-ignore
    castNames.forEach((row: any, index: number) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${row.cast_name}`);
    });

    // 8. プロフィールテーブルの存在確認
    console.log('\n【8. プロフィールテーブルの確認】\n');

    const profileTables = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW TABLES LIKE '%profile%'");
      return rows;
    });

    if (Array.isArray(profileTables) && profileTables.length > 0) {
      console.log('  ✅ プロフィール関連テーブル:');
      // @ts-ignore
      profileTables.forEach((row: any) => {
        const tableName = Object.values(row)[0];
        console.log(`     - ${tableName}`);
      });
    } else {
      console.log('  ⚠️  プロフィール関連テーブルは存在しません');
    }

    // 9. user_id=40824のプロフィール情報を取得
    console.log('\n【9. user_id=40824のプロフィール情報】\n');

    try {
      const profileData = await withSshMysql(async (conn) => {
        const [rows] = await conn.query("SELECT * FROM profiles WHERE user_id = 40824");
        return rows;
      });

      if (!Array.isArray(profileData) || profileData.length === 0) {
        console.log('  ⚠️  profilesテーブルにuser_id=40824のレコードが見つかりませんでした');
      } else {
        // @ts-ignore
        const profile = profileData[0];
        console.log('  ✅ プロフィールが見つかりました\n');
        Object.keys(profile).forEach(key => {
          const value = profile[key];
          const displayValue = value === null ? 'NULL' :
                             typeof value === 'object' ? JSON.stringify(value) :
                             value.toString();
          console.log(`     ${key.padEnd(30, ' ')} : ${displayValue}`);
        });
      }
    } catch (error) {
      console.log('  ⚠️  profilesテーブルが存在しないか、アクセスできませんでした');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ site_casts & v_managersテーブルの詳細調査が完了しました');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  }
}

searchSiteCasts();
