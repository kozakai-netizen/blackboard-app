import { withSshMysql } from '../lib/db/sshMysql';

async function checkSitesCrews() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('STGデータベース - sites_crews テーブル構造確認レポート');
    console.log('='.repeat(80) + '\n');

    const result = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW COLUMNS FROM sites_crews");
      return rows;
    });

    console.log('【1. テーブル構造】\n');

    // @ts-ignore
    result.forEach((column: any, index: number) => {
      const nullInfo = column.Null === 'YES' ? 'NULL可' : '必須';
      const defaultInfo = column.Default ? ` (デフォルト: ${column.Default})` : '';
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${column.Field.padEnd(20, ' ')} : ${column.Type.padEnd(15, ' ')} [${nullInfo}]${defaultInfo}`);
    });

    // @ts-ignore
    const fieldNames = result.map((col: any) => col.Field);

    console.log('\n【2. 重要カラムの識別】\n');
    console.log(`  ✓ 現場ID (site_id に相当)  : ${fieldNames.includes('site_id') ? 'site_id' : '見つかりません'}`);
    console.log(`  ✓ ユーザーID (user_id に相当): ${fieldNames.includes('crew_id') ? 'crew_id' : '見つかりません'}`);
    console.log(`  ✓ ユーザーレベル           : ${fieldNames.includes('user_level') ? 'user_level' : '見つかりません'}`);
    console.log(`  ✓ 削除フラグ               : ${fieldNames.includes('deleted') ? 'deleted' : '見つかりません'}`);

    // サンプルデータを取得
    console.log('\n【3. サンプルデータ（最新5件）】\n');
    const sampleData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SELECT * FROM sites_crews WHERE deleted = 0 ORDER BY id DESC LIMIT 5");
      return rows;
    });

    // @ts-ignore
    sampleData.forEach((row: any, index: number) => {
      const createdDate = new Date(row.created).toLocaleDateString('ja-JP');
      console.log(`  ${index + 1}. ID: ${row.id.toString().padStart(8, ' ')} | site_id: ${row.site_id.toString().padStart(6, ' ')} | crew_id: ${row.crew_id.toString().padStart(6, ' ')} | level: ${row.user_level} | 作成日: ${createdDate}`);
    });

    // インデックス情報を取得
    console.log('\n【4. インデックス情報】\n');
    const indexData = await withSshMysql(async (conn) => {
      const [rows] = await conn.query("SHOW INDEX FROM sites_crews");
      return rows;
    });

    // @ts-ignore
    const uniqueIndexes = [...new Set(indexData.map((idx: any) => idx.Key_name))];
    uniqueIndexes.forEach((indexName: string) => {
      // @ts-ignore
      const columns = indexData.filter((idx: any) => idx.Key_name === indexName);
      // @ts-ignore
      const columnNames = columns.map((col: any) => col.Column_name).join(', ');
      // @ts-ignore
      const isUnique = columns[0].Non_unique === 0 ? 'ユニーク' : '通常';
      console.log(`  ${isUnique === 'ユニーク' ? '🔑' : '📑'} ${indexName.padEnd(45, ' ')} : ${columnNames}`);
    });

    // レコード数を取得
    console.log('\n【5. データ統計】\n');
    const stats = await withSshMysql(async (conn) => {
      const [rows] = await conn.query(`
        SELECT
          COUNT(*) as total_count,
          COUNT(DISTINCT site_id) as unique_sites,
          COUNT(DISTINCT crew_id) as unique_crews,
          SUM(CASE WHEN deleted = 0 THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN deleted = 1 THEN 1 ELSE 0 END) as deleted_count
        FROM sites_crews
      `);
      return rows;
    });

    // @ts-ignore
    const stat = stats[0];
    const formatNumber = (num: number) => num.toLocaleString('ja-JP');

    console.log(`  全レコード数        : ${formatNumber(stat.total_count).padStart(12, ' ')}`);
    console.log(`  有効レコード        : ${formatNumber(stat.active_count).padStart(12, ' ')} (${((stat.active_count / stat.total_count) * 100).toFixed(1)}%)`);
    console.log(`  削除済みレコード    : ${formatNumber(stat.deleted_count).padStart(12, ' ')} (${((stat.deleted_count / stat.total_count) * 100).toFixed(1)}%)`);
    console.log(`  ユニークな現場数    : ${formatNumber(stat.unique_sites).padStart(12, ' ')}`);
    console.log(`  ユニークなユーザー数: ${formatNumber(stat.unique_crews).padStart(12, ' ')}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ テーブル構造の確認が完了しました');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
  }
}

checkSitesCrews();
