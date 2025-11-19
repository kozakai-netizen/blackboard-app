// DBインデックスの確認と推奨スクリプト
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { withSshMysql } from '../lib/db/sshMysql';

// 推奨インデックス定義
const RECOMMENDED_INDEXES = [
  {
    table: 'crews',
    name: 'idx_crews_user_place_deleted',
    columns: ['user_id', 'place_id', 'deleted'],
    reason: 'getRoleForPlace関数で使用（user_id + place_id での高速検索）'
  },
  {
    table: 'crews',
    name: 'idx_crews_place_company_deleted',
    columns: ['place_id', 'company_id', 'deleted'],
    reason: '元請け会社フィルタリング用'
  },
  {
    table: 'sites',
    name: 'idx_sites_place_deleted_status',
    columns: ['place_id', 'deleted', 'site_status'],
    reason: 'quicklist APIでのステータス別現場取得'
  },
  {
    table: 'sites_crews',
    name: 'idx_sites_crews_site_crew_deleted',
    columns: ['site_id', 'crew_id', 'deleted'],
    reason: 'v_my_sitesビューで使用（site_id + crew_id での高速JOIN）'
  },
  {
    table: 'site_casts',
    name: 'idx_site_casts_site_crew_deleted',
    columns: ['site_id', 'crew_id', 'deleted'],
    reason: 'v_my_sitesビューで使用（site_id + crew_id での高速JOIN）'
  },
];

async function checkIndexes() {
  console.log('\n' + '='.repeat(80));
  console.log('【DBインデックス確認】');
  console.log('='.repeat(80) + '\n');

  try {
    for (const rec of RECOMMENDED_INDEXES) {
      console.log('='.repeat(80));
      console.log(`テーブル: ${rec.table}`);
      console.log(`推奨インデックス: ${rec.name}`);
      console.log(`カラム: [${rec.columns.join(', ')}]`);
      console.log(`理由: ${rec.reason}`);
      console.log('='.repeat(80) + '\n');

      // 既存インデックスを取得
      const existingIndexes = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`SHOW INDEX FROM ${rec.table}`);
        return rows as any[];
      });

      // 推奨インデックスが存在するかチェック
      const indexExists = existingIndexes.some((idx: any) => idx.Key_name === rec.name);

      if (indexExists) {
        console.log(`✅ インデックス ${rec.name} は既に存在します\n`);

        // インデックスの詳細を表示
        const indexDetails = existingIndexes.filter((idx: any) => idx.Key_name === rec.name);
        console.log('【インデックス詳細】');
        indexDetails.forEach((idx: any) => {
          console.log(`  カラム: ${idx.Column_name} (順序: ${idx.Seq_in_index}, Cardinality: ${idx.Cardinality || 'N/A'})`);
        });
        console.log('');
      } else {
        console.log(`❌ インデックス ${rec.name} は存在しません\n`);

        // カラムの複合インデックスが別名で存在するかチェック
        const columnsStr = rec.columns.join('_');
        const similarIndexes = existingIndexes.filter((idx: any) => {
          const idxColumns = existingIndexes
            .filter((i: any) => i.Key_name === idx.Key_name)
            .sort((a: any, b: any) => a.Seq_in_index - b.Seq_in_index)
            .map((i: any) => i.Column_name);

          return JSON.stringify(idxColumns) === JSON.stringify(rec.columns);
        });

        if (similarIndexes.length > 0) {
          const similarIndexName = similarIndexes[0].Key_name;
          console.log(`⚠️  同じカラム構成のインデックスが別名で存在します: ${similarIndexName}\n`);
        } else {
          console.log('💡 推奨SQL:');
          console.log(`CREATE INDEX ${rec.name} ON ${rec.table} (${rec.columns.join(', ')});\n`);
        }
      }

      // テーブルの全インデックスを表示
      console.log('【既存インデックス一覧】');
      const uniqueIndexNames = Array.from(new Set(existingIndexes.map((idx: any) => idx.Key_name)));
      uniqueIndexNames.forEach((name: any) => {
        const cols = existingIndexes
          .filter((idx: any) => idx.Key_name === name)
          .sort((a: any, b: any) => a.Seq_in_index - b.Seq_in_index)
          .map((idx: any) => idx.Column_name);

        const indexType = existingIndexes.find((idx: any) => idx.Key_name === name)?.Index_type || 'BTREE';
        const nonUnique = existingIndexes.find((idx: any) => idx.Key_name === name)?.Non_unique;
        const unique = nonUnique === 0 ? ' [UNIQUE]' : '';

        console.log(`  ${name}${unique}: (${cols.join(', ')}) [${indexType}]`);
      });

      console.log('\n');
    }

    // まとめ
    console.log('='.repeat(80));
    console.log('【まとめ】');
    console.log('='.repeat(80) + '\n');

    console.log('推奨インデックスの作成SQL（存在しないもののみ）:\n');

    for (const rec of RECOMMENDED_INDEXES) {
      const existingIndexes = await withSshMysql(async (conn) => {
        const [rows] = await conn.query(`SHOW INDEX FROM ${rec.table}`);
        return rows as any[];
      });

      const indexExists = existingIndexes.some((idx: any) => idx.Key_name === rec.name);

      if (!indexExists) {
        const similarIndexes = existingIndexes.filter((idx: any) => {
          const idxColumns = existingIndexes
            .filter((i: any) => i.Key_name === idx.Key_name)
            .sort((a: any, b: any) => a.Seq_in_index - b.Seq_in_index)
            .map((i: any) => i.Column_name);

          return JSON.stringify(idxColumns) === JSON.stringify(rec.columns);
        });

        if (similarIndexes.length === 0) {
          console.log(`-- ${rec.reason}`);
          console.log(`CREATE INDEX ${rec.name} ON ${rec.table} (${rec.columns.join(', ')});`);
          console.log('');
        }
      }
    }

    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkIndexes();
