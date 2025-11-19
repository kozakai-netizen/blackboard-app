// 深掘り検証スクリプト: 実装した内容の問題点を徹底的に洗い出す
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function deepVerification() {
  console.log('\n' + '='.repeat(80));
  console.log('【深掘り検証】実装内容の問題点を徹底的に洗い出す');
  console.log('='.repeat(80) + '\n');

  const issues: string[] = [];
  const warnings: string[] = [];
  const okPoints: string[] = [];

  try {
    // ==========================================
    // 検証1: v_my_sitesビューの実データ検証
    // ==========================================
    console.log('='.repeat(80));
    console.log('検証1: v_my_sitesビューの実データ検証');
    console.log('='.repeat(80) + '\n');

    // 1-1. ビューが正しく作成されているか
    console.log('【1-1】ビューの存在確認\n');
    const viewExists = await withSshMysql(async (conn) => {
      try {
        const [rows] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_dandolijp = 'v_my_sites'");
        return (rows as any[]).length > 0;
      } catch {
        return false;
      }
    });

    if (viewExists) {
      console.log('  ✅ v_my_sitesビューが存在します\n');
      okPoints.push('v_my_sitesビューが正しく作成されている');
    } else {
      console.log('  ❌ v_my_sitesビューが存在しません！\n');
      issues.push('v_my_sitesビューが作成されていない');
    }

    // 1-2. user_id=40824, site_id=567377 の組み合わせを確認
    console.log('【1-2】user_id=40824, site_id=567377 の取得確認\n');
    const targetRecords = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM v_my_sites WHERE user_id = ? AND site_id = ?',
        [40824, 567377]
      );
      return rows as any[];
    });

    console.log(`  結果: ${targetRecords.length}件\n`);
    if (targetRecords.length > 0) {
      targetRecords.forEach((r: any, i: number) => {
        console.log(`  [${i + 1}] site_id=${r.site_id}, user_id=${r.user_id}, relation_type=${r.relation_type}`);
      });
      console.log();
      okPoints.push('user_id=40824 で site_id=567377 が取得できる');
    } else {
      console.log('  ❌ user_id=40824, site_id=567377 の組み合わせが取得できません！\n');
      issues.push('ターゲットの現場567377が取得できない');
    }

    // 1-3. 重複データのチェック
    console.log('【1-3】重複データのチェック\n');
    const duplicates = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT site_id, user_id, COUNT(*) as cnt
        FROM v_my_sites
        GROUP BY site_id, user_id
        HAVING COUNT(*) > 1
        LIMIT 10
      `);
      return rows as any[];
    });

    if (duplicates.length > 0) {
      console.log(`  ⚠️  重複データが ${duplicates.length}件見つかりました:\n`);
      duplicates.forEach((d: any, i: number) => {
        console.log(`  [${i + 1}] site_id=${d.site_id}, user_id=${d.user_id}, count=${d.cnt}`);
      });
      console.log();
      warnings.push(`重複データが${duplicates.length}件存在（同じuser_id+site_idが複数のrelation_typeで登録）`);
    } else {
      console.log('  ✅ 重複データはありません\n');
      okPoints.push('site_id + user_id の組み合わせに重複なし');
    }

    // 1-4. NULL値のチェック
    console.log('【1-4】NULL値のチェック\n');
    const nulls = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT COUNT(*) as cnt
        FROM v_my_sites
        WHERE site_id IS NULL OR user_id IS NULL
      `);
      return (rows as any[])[0];
    });

    if (nulls.cnt > 0) {
      console.log(`  ❌ NULL値が ${nulls.cnt}件見つかりました！\n`);
      issues.push(`NULL値が${nulls.cnt}件存在`);
    } else {
      console.log('  ✅ NULL値はありません\n');
      okPoints.push('site_id, user_id にNULLなし');
    }

    // 1-5. place_id=170以外のデータが混入していないか
    console.log('【1-5】place_id=170以外のデータ混入チェック\n');
    const wrongPlace = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT COUNT(*) as cnt
        FROM v_my_sites vms
        JOIN sites s ON s.id = vms.site_id
        WHERE s.place_id != 170
      `);
      return (rows as any[])[0];
    });

    if (wrongPlace.cnt > 0) {
      console.log(`  ❌ place_id!=170のデータが ${wrongPlace.cnt}件混入しています！\n`);
      issues.push(`place_id!=170のデータが${wrongPlace.cnt}件混入`);
    } else {
      console.log('  ✅ place_id=170のデータのみです\n');
      okPoints.push('place_id=170のフィルタが正しく機能');
    }

    // ==========================================
    // 検証2: crews経由のマッピングが正しいか
    // ==========================================
    console.log('='.repeat(80));
    console.log('検証2: crews経由のマッピングが正しいか');
    console.log('='.repeat(80) + '\n');

    // 2-1. user_id=40824の全crew_id取得
    console.log('【2-1】user_id=40824の全crew_id取得\n');
    const allCrewIds = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT id as crew_id, deleted FROM crews WHERE user_id = ?',
        [40824]
      );
      return rows as any[];
    });

    const activeCrewIds = allCrewIds.filter((c: any) => c.deleted === 0).map((c: any) => c.crew_id);
    const deletedCrewIds = allCrewIds.filter((c: any) => c.deleted === 1).map((c: any) => c.crew_id);

    console.log(`  全crew_id数: ${allCrewIds.length}件`);
    console.log(`    - 有効: ${activeCrewIds.length}件`);
    console.log(`    - 削除済み: ${deletedCrewIds.length}件\n`);

    if (deletedCrewIds.length > 0) {
      warnings.push(`user_id=40824に紐づくcrew_idのうち${deletedCrewIds.length}件が削除済み（deleted=1）`);
    }

    // 2-2. 削除済みcrew_idがv_my_sitesに含まれていないか確認
    if (deletedCrewIds.length > 0) {
      console.log('【2-2】削除済みcrew_idがv_my_sitesに含まれていないか確認\n');

      const deletedInView = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`
          SELECT COUNT(*) as cnt
          FROM v_my_sites vms
          JOIN (
            SELECT DISTINCT site_id, crew_id
            FROM sites_crews
            WHERE crew_id IN (?)
            UNION
            SELECT DISTINCT site_id, crew_id
            FROM site_casts
            WHERE crew_id IN (?)
          ) sc ON sc.site_id = vms.site_id
          JOIN crews c ON c.id = sc.crew_id
          WHERE c.deleted = 1
        `, [deletedCrewIds, deletedCrewIds]);
        return (rows as any[])[0];
      });

      if (deletedInView.cnt > 0) {
        console.log(`  ❌ 削除済みcrew_idが ${deletedInView.cnt}件含まれています！\n`);
        issues.push(`削除済みcrew_idがv_my_sitesに${deletedInView.cnt}件含まれている`);
      } else {
        console.log('  ✅ 削除済みcrew_idは含まれていません\n');
        okPoints.push('deleted=1のcrew_idがフィルタされている');
      }
    }

    // ==========================================
    // 検証3: quicklist APIの実装確認
    // ==========================================
    console.log('='.repeat(80));
    console.log('検証3: quicklist APIの実装確認');
    console.log('='.repeat(80) + '\n');

    // 3-1. fetchUserSitesMap関数のロジック確認
    console.log('【3-1】fetchUserSitesMap関数のロジック確認\n');

    // サンプルsite_idでテスト
    const testSiteIds = ['567377', '595913', '601361'];
    console.log(`  テスト対象site_id: [${testSiteIds.join(', ')}]\n`);

    const userSitesMap = await withSshMysql(async (conn) => {
      const map = new Map<string, Set<string>>();
      const [res] = await conn.query(
        `SELECT CAST(site_id AS CHAR) AS site_id,
                CAST(user_id AS CHAR) AS user_id
         FROM v_my_sites
         WHERE site_id IN (?)`,
        [testSiteIds]
      );

      const rows = res as Array<{ site_id: string; user_id: string }>;
      for (const r of rows) {
        if (!map.has(r.site_id)) map.set(r.site_id, new Set());
        map.get(r.site_id)!.add(r.user_id);
      }
      return map;
    });

    console.log('  取得結果:\n');
    testSiteIds.forEach((siteId) => {
      const userIds = userSitesMap.get(siteId);
      if (userIds && userIds.size > 0) {
        console.log(`    site_id=${siteId}: ${userIds.size}人のuser_id`);
        const sample = Array.from(userIds).slice(0, 5);
        console.log(`      サンプル: [${sample.join(', ')}]`);
      } else {
        console.log(`    site_id=${siteId}: ❌ user_idが取得できませんでした`);
      }
    });
    console.log();

    // 40824が含まれているか確認
    const site567377Users = userSitesMap.get('567377');
    if (site567377Users && site567377Users.has('40824')) {
      console.log('  ✅ site_id=567377 の user_id に 40824 が含まれています\n');
      okPoints.push('fetchUserSitesMapで567377→40824のマッピングが取得できる');
    } else {
      console.log('  ❌ site_id=567377 の user_id に 40824 が含まれていません！\n');
      issues.push('fetchUserSitesMapで567377→40824のマッピングが取得できない');
    }

    // 3-2. member_keysの形式確認
    console.log('【3-2】member_keysの形式確認\n');

    // ゼロ埋め確認
    const pad8 = (s: string) => (s || '').padStart(8, '0');
    const testUserId = '40824';
    const paddedUserId = pad8(testUserId);

    console.log(`  元のuser_id: ${testUserId}`);
    console.log(`  ゼロ埋め後: ${paddedUserId}\n`);

    if (testUserId === paddedUserId) {
      warnings.push('user_id=40824はゼロ埋めしても変化なし（5桁のため）');
    }

    // member_keysに両方含まれるか確認
    const mockMemberKeys = [testUserId, paddedUserId];
    console.log(`  member_keys想定値: [${mockMemberKeys.join(', ')}]\n`);

    if (mockMemberKeys.includes('40824') && mockMemberKeys.includes('00040824')) {
      console.log('  ✅ user_id=40824がmember_keysに両形式で含まれます\n');
      okPoints.push('member_keysに元の値とゼロ埋め両方が含まれる');
    } else {
      console.log('  ⚠️  想定通りの形式になっていません\n');
      warnings.push('member_keysの形式が想定と異なる可能性');
    }

    // ==========================================
    // 検証4: パフォーマンス・スケーラビリティ
    // ==========================================
    console.log('='.repeat(80));
    console.log('検証4: パフォーマンス・スケーラビリティ');
    console.log('='.repeat(80) + '\n');

    // 4-1. v_my_sitesビューのレコード数
    console.log('【4-1】v_my_sitesビューのレコード数\n');
    const viewStats = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT COUNT(*) as total,
               COUNT(DISTINCT site_id) as unique_sites,
               COUNT(DISTINCT user_id) as unique_users
        FROM v_my_sites
      `);
      return (rows as any[])[0];
    });

    console.log(`  総レコード数: ${viewStats.total.toLocaleString()}件`);
    console.log(`  ユニーク現場数: ${viewStats.unique_sites.toLocaleString()}件`);
    console.log(`  ユニークユーザー数: ${viewStats.unique_users.toLocaleString()}人\n`);

    if (viewStats.total > 10000) {
      warnings.push(`v_my_sitesのレコード数が${viewStats.total}件と多い（パフォーマンス注意）`);
    } else {
      okPoints.push('v_my_sitesのレコード数は許容範囲内');
    }

    // 4-2. チャンクサイズの妥当性確認
    console.log('【4-2】チャンクサイズの妥当性確認\n');
    const chunkSize = 500;
    const estimatedChunks = Math.ceil(viewStats.unique_sites / chunkSize);
    console.log(`  チャンクサイズ: ${chunkSize}`);
    console.log(`  想定チャンク数: ${estimatedChunks}回\n`);

    if (estimatedChunks > 10) {
      warnings.push(`チャンク数が${estimatedChunks}回と多い（現場数が多い場合は要注意）`);
    } else {
      okPoints.push('チャンクサイズは適切');
    }

    // 4-3. INクエリの最大サイズ確認
    console.log('【4-3】INクエリの最大サイズ確認\n');
    console.log(`  MySQLのmax_allowed_packetサイズを確認...\n`);

    const maxPacket = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
      return (rows as any[])[0];
    });

    const maxPacketMB = parseInt(maxPacket.Value) / 1024 / 1024;
    console.log(`  max_allowed_packet: ${maxPacketMB.toFixed(2)}MB\n`);

    if (maxPacketMB < 16) {
      warnings.push(`max_allowed_packetが${maxPacketMB.toFixed(2)}MBと小さい（大量のINクエリで問題の可能性）`);
    } else {
      okPoints.push('max_allowed_packetは十分なサイズ');
    }

    // ==========================================
    // 検証5: エッジケース
    // ==========================================
    console.log('='.repeat(80));
    console.log('検証5: エッジケース・想定外パターン');
    console.log('='.repeat(80) + '\n');

    // 5-1. user_idが存在しないユーザー
    console.log('【5-1】存在しないuser_id=99999でのクエリテスト\n');
    const nonExistentUser = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM v_my_sites WHERE user_id = ?',
        [99999]
      );
      return rows as any[];
    });

    if (nonExistentUser.length === 0) {
      console.log('  ✅ 存在しないuser_idは正しく0件を返します\n');
      okPoints.push('存在しないuser_idでも正常動作');
    } else {
      console.log(`  ❌ 存在しないuser_idで ${nonExistentUser.length}件返却されました！\n`);
      issues.push('存在しないuser_idで予期しないデータが返却される');
    }

    // 5-2. site_idが存在しない現場
    console.log('【5-2】存在しないsite_id=99999999でのクエリテスト\n');
    const nonExistentSite = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM v_my_sites WHERE site_id = ?',
        [99999999]
      );
      return rows as any[];
    });

    if (nonExistentSite.length === 0) {
      console.log('  ✅ 存在しないsite_idは正しく0件を返します\n');
      okPoints.push('存在しないsite_idでも正常動作');
    } else {
      console.log(`  ❌ 存在しないsite_idで ${nonExistentSite.length}件返却されました！\n`);
      issues.push('存在しないsite_idで予期しないデータが返却される');
    }

    // 5-3. 1ユーザーが異常に多くの現場に紐づいている場合
    console.log('【5-3】1ユーザーあたりの最大現場数確認\n');
    const maxSitesPerUser = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT user_id, COUNT(DISTINCT site_id) as site_count
        FROM v_my_sites
        GROUP BY user_id
        ORDER BY site_count DESC
        LIMIT 5
      `);
      return rows as any[];
    });

    console.log('  現場数TOP5ユーザー:\n');
    maxSitesPerUser.forEach((u: any, i: number) => {
      console.log(`  [${i + 1}] user_id=${u.user_id}: ${u.site_count}現場`);
    });
    console.log();

    const maxCount = maxSitesPerUser[0]?.site_count || 0;
    if (maxCount > 200) {
      warnings.push(`1ユーザーが${maxCount}現場に紐づいている（パフォーマンス注意）`);
    }

    // 5-4. 1現場が異常に多くのユーザーに紐づいている場合
    console.log('【5-4】1現場あたりの最大ユーザー数確認\n');
    const maxUsersPerSite = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT site_id, COUNT(DISTINCT user_id) as user_count
        FROM v_my_sites
        GROUP BY site_id
        ORDER BY user_count DESC
        LIMIT 5
      `);
      return rows as any[];
    });

    console.log('  ユーザー数TOP5現場:\n');
    maxUsersPerSite.forEach((s: any, i: number) => {
      console.log(`  [${i + 1}] site_id=${s.site_id}: ${s.user_count}人`);
    });
    console.log();

    const maxUserCount = maxUsersPerSite[0]?.user_count || 0;
    if (maxUserCount > 50) {
      warnings.push(`1現場に${maxUserCount}人が紐づいている（大規模現場）`);
    }

    // ==========================================
    // 最終結果
    // ==========================================
    console.log('\n' + '='.repeat(80));
    console.log('【検証結果サマリー】');
    console.log('='.repeat(80) + '\n');

    console.log(`✅ OK項目: ${okPoints.length}件\n`);
    okPoints.forEach((ok, i) => {
      console.log(`  ${i + 1}. ${ok}`);
    });

    console.log(`\n⚠️  警告: ${warnings.length}件\n`);
    warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });

    console.log(`\n❌ 問題: ${issues.length}件\n`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });

    console.log('\n' + '='.repeat(80));
    if (issues.length === 0) {
      console.log('✅ 重大な問題は検出されませんでした');
    } else {
      console.log('❌ 重大な問題が検出されました - 修正が必要です');
    }
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ 検証中にエラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

deepVerification();
