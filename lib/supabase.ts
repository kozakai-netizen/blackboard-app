// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Manifest } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getServerSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey);
}

// TODO: マニフェスト自動アップロード機能の追加
// 【現状】
// - Supabase Storageにマニフェストを保存のみ
// - ユーザーは手動でマニフェストをダウンロード可能
//
// 【将来実装】
// - Supabase保存後、ダンドリワークAPIへ自動アップロード
// - エンドポイント: /co/places/{place_code}/sites/{site_code}/documents
// - パラメータ:
//   - file_type: "電子小黒板マニフェスト"（事前にカテゴリ作成が必要）
//   - data[files][]: manifest.jsonファイル
//   - data[crew][]: 閲覧可能ユーザーのuser_code配列
//   - update_crew: 更新ユーザーのuser_code
// - 実装イメージ:
//   1. Supabaseに保存
//   2. 保存したマニフェストをBlobに変換
//   3. ダンドリワークAPI（/api/dandori/documents）にPOST
//   4. エラー時はSupabaseのみに保持（後でリトライ可能）
export async function saveManifest(manifest: Manifest): Promise<string> {
  const filename = `${manifest.jobId}/manifest.json`;
  const data = JSON.stringify(manifest, null, 2);

  // Supabaseに保存
  const { data: uploadData, error } = await supabase.storage
    .from('manifests')
    .upload(filename, new Blob([data], { type: 'application/json' }), {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to save manifest: ${error.message}`);
  }

  // TODO: ここでダンドリワークAPIへマニフェストを自動アップロード
  // try {
  //   const manifestBlob = new Blob([data], { type: 'application/json' });
  //   await uploadManifestToDandori(manifest.placeCode, manifest.siteCode, manifestBlob, filename);
  // } catch (error) {
  //   console.error('⚠️ Failed to upload manifest to Dandori API:', error);
  //   // エラーでも処理は続行（Supabaseには保存済み）
  // }

  return uploadData.path;
}

export async function getManifest(jobId: string): Promise<Manifest> {
  const filename = `${jobId}/manifest.json`;

  const { data, error } = await supabase.storage
    .from('manifests')
    .download(filename);

  if (error) {
    throw new Error(`Failed to get manifest: ${error.message}`);
  }

  const text = await data.text();
  return JSON.parse(text);
}

export async function listManifests(limit = 50): Promise<string[]> {
  const { data, error } = await supabase.storage
    .from('manifests')
    .list('', { limit, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) {
    throw new Error(`Failed to list manifests: ${error.message}`);
  }

  return data.map(file => file.name);
}
