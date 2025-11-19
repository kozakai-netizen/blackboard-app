// DB再調査: user_id=40824 → crews → sites_crews/site_casts/v_managers の流れを確認
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

async function investigateCrewsMapping() {
  console.log('\n' + '='.repeat(80));
  console.log('【DB再調査】user_id=40824 → crews → 担当現場の流れを確認');
  console.log('='.repeat(80) + '\n');

  try {
    // ==========================================
    // Step1: crewsテーブルで user_id = 40824 を検索
    // ==========================================
    console.log('='.repeat(80));
    console.log('Step1: crewsテーブルで user_id = 40824 を検索');
    console.log('='.repeat(80));

    // まず、crewsテーブルの構造を確認
    console.log('\n【crewsテーブル構造】\n');
    const crewsColumns = await withSshMysql(async (conn) => {
      const [rows] = await conn.query('SHOW COLUMNS FROM crews');
      return rows as any[];
    });

    crewsColumns.forEach((col: any) => {
      const nullInfo = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(25)} ${nullInfo}`);
    });

    // user_id = 40824 で検索
    console.log('\n【SQL】user_id = 40824 のレコード\n');
    console.log('SQL:');
    console.log('  SELECT * FROM crews WHERE user_id = 40824;\n');

    const crews40824 = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(
        'SELECT * FROM crews WHERE user_id = ?',
        [40824]
      );
      return rows as any[];
    });

    console.log(`結果: ${crews40824.length}件のレコード\n`);

    if (crews40824.length === 0) {
      console.log('  ❌ user_id=40824 に対応するcrewsレコードが見つかりませんでした');
      console.log('  → user_idとcrew_idは同じ値を使っている可能性があります\n');

      // user_id=crew_idと仮定して続行
      console.log('  💡 user_id=crew_idと仮定して、crew_id=40824で再調査します\n');

      const crewIds = [40824];
      await investigateWithCrewIds(crewIds);
      return;
    }

    // crew_id一覧を取得
    const crewIds = crews40824.map((c: any) => c.id);
    console.log('  ✅ 取得したcrew_id一覧:\n');
    crews40824.forEach((c: any, i: number) => {
      console.log(`    [${i + 1}] crew_id=${c.id}, user_id=${c.user_id}, name=${c.name || '不明'}, deleted=${c.deleted || 0}`);
    });

    console.log(`\n  → 合計 ${crewIds.length}個のcrew_idを取得しました\n`);

    // ==========================================
    // Step2: そのcrew_id達で567377を検索
    // ==========================================
    await investigateWithCrewIds(crewIds);

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function investigateWithCrewIds(crewIds: number[]) {
  console.log('='.repeat(80));
  console.log('Step2: crew_id達で site_id=567377 を検索');
  console.log('='.repeat(80));

  console.log(`\n対象crew_id: [${crewIds.join(', ')}]\n`);

  // 2-1. sites_crewsテーブル
  console.log('【2-1】sites_crews で検索\n');
  console.log('SQL:');
  console.log(`  SELECT *
  FROM sites_crews
  WHERE site_id = 567377
    AND crew_id IN (${crewIds.join(', ')});\n`);

  const sitesCrews = await withSshMysql(async (conn) => {
    const [rows] = await conn.query(
      `SELECT *
       FROM sites_crews
       WHERE site_id = ?
         AND crew_id IN (?)`,
      [567377, crewIds]
    );
    return rows as any[];
  });

  console.log(`結果: ${sitesCrews.length}件のレコード\n`);

  if (sitesCrews.length > 0) {
    console.log('  🎯 ヒットしました！\n');
    sitesCrews.forEach((r: any, i: number) => {
      console.log(`  [${i + 1}] id=${r.id}, site_id=${r.site_id}, crew_id=${r.crew_id}, user_level=${r.user_level}, deleted=${r.deleted}`);
    });
  } else {
    console.log('  ❌ ヒットしませんでした');
  }

  // 2-2. site_castsテーブル
  console.log('\n【2-2】site_casts で検索\n');
  console.log('SQL:');
  console.log(`  SELECT *
  FROM site_casts
  WHERE site_id = 567377
    AND crew_id IN (${crewIds.join(', ')});\n`);

  const siteCasts = await withSshMysql(async (conn) => {
    const [rows] = await conn.query(
      `SELECT *
       FROM site_casts
       WHERE site_id = ?
         AND crew_id IN (?)`,
      [567377, crewIds]
    );
    return rows as any[];
  });

  console.log(`結果: ${siteCasts.length}件のレコード\n`);

  if (siteCasts.length > 0) {
    console.log('  🎯 ヒットしました！\n');
    siteCasts.forEach((r: any, i: number) => {
      console.log(`  [${i + 1}] id=${r.id}, site_id=${r.site_id}, crew_id=${r.crew_id}, cast_id=${r.cast_id}, deleted=${r.deleted}`);
    });
  } else {
    console.log('  ❌ ヒットしませんでした');
  }

  // 2-3. v_managersビュー
  console.log('\n【2-3】v_managers で検索\n');
  console.log('SQL:');
  console.log(`  SELECT *
  FROM v_managers
  WHERE site_id = 567377
    AND crew_id IN (${crewIds.join(', ')});\n`);

  const vManagers = await withSshMysql(async (conn) => {
    const [rows] = await conn.query(
      `SELECT *
       FROM v_managers
       WHERE site_id = ?
         AND crew_id IN (?)`,
      [567377, crewIds]
    );
    return rows as any[];
  });

  console.log(`結果: ${vManagers.length}件のレコード\n`);

  if (vManagers.length > 0) {
    console.log('  🎯 ヒットしました！\n');
    vManagers.forEach((r: any, i: number) => {
      console.log(`  [${i + 1}] crew_id=${r.crew_id}, site_id=${r.site_id}, admin_level=${r.admin_level}`);
    });
  } else {
    console.log('  ❌ ヒットしませんでした');
  }

  // ==========================================
  // まとめ
  // ==========================================
  console.log('\n' + '='.repeat(80));
  console.log('【再調査結果まとめ】');
  console.log('='.repeat(80));

  console.log(`\n対象: user_id=40824 に対応するcrew_id=[${crewIds.join(', ')}]\n`);

  const totalHits = sitesCrews.length + siteCasts.length + vManagers.length;

  if (totalHits > 0) {
    console.log('✅ **user_id=40824 は site_id=567377 に紐づいています！**\n');
    console.log('紐付け詳細:');
    if (sitesCrews.length > 0) {
      console.log(`  - sites_crews: ${sitesCrews.length}件（参加ユーザー）`);
    }
    if (siteCasts.length > 0) {
      console.log(`  - site_casts: ${siteCasts.length}件（役割担当者）`);
    }
    if (vManagers.length > 0) {
      console.log(`  - v_managers: ${vManagers.length}件（現場管理担当者）`);
    }
    console.log('\n→ DB上でも「40824は567377の担当」として正しく登録されています');
    console.log('→ v_my_sitesをuser_idベースで設計できます\n');
  } else {
    console.log('❌ **user_id=40824 は site_id=567377 に紐づいていません**\n');
    console.log('考えられる原因:');
    console.log('  1. 本番DWとSTG Work DBのデータ不整合');
    console.log('  2. 画面表示がsites_crews以外の何か（別DB、キャッシュ）を参照');
    console.log('  3. 権限レベル（プレイス管理者など）による動的な表示');
    console.log('  4. user_idとcrew_idの対応関係が複雑（複数のcrewsレコードなど）\n');
  }

  console.log('='.repeat(80) + '\n');
}

investigateCrewsMapping();
