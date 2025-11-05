// lib/dandori-api.ts
import type { DandoriSite, DandoriUploadResponse } from '@/types';

// API_BASE は将来の直接API呼び出し用（現在は未使用）
// const API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE!;

export async function getSites(placeCode: string): Promise<DandoriSite[]> {
  const response = await fetch(`/api/dandori/sites?place_code=${placeCode}`);

  if (!response.ok) {
    throw new Error(`Failed to get sites: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function uploadPhotos(
  placeCode: string,
  siteCode: string,
  categoryName: string,
  updateCrew: string,
  files: { filename: string; blob: Blob }[]
): Promise<DandoriUploadResponse> {
  const formData = new FormData();
  formData.set('place_code', placeCode);
  formData.set('site_code', siteCode);
  formData.set('category_name', categoryName);
  formData.set('update_crew', updateCrew);

  files.slice(0, 10).forEach(file => {
    formData.append('files', file.blob, file.filename);
  });

  const response = await fetch('/api/dandori/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} ${error}`);
  }

  return response.json();
}

// TODO: ダンドリワークAPI連携（現在はモック実装）
// 【現状】
// - /api/dandori/upload にリクエストを送信（BFF経由）
// - 実際にはダンドリワークAPIに保存されていない（進捗表示のみ）
//
// 【将来実装】
// - エンジニアからAPI詳細を受領後、実装を完了させる
// - 必要情報:
//   1. エンドポイントURL: /co/places/{place_code}/sites/{site_code}/site_photos
//   2. 認証方式: Bearer Token（環境変数経由）
//   3. リクエストパラメータ:
//      - data[files][]: 画像ファイル（最大10枚/リクエスト）
//      - data[crew][]: 閲覧可能ユーザーのuser_code配列
//      - update_crew: 更新ユーザーのuser_code
//      - category: 写真カテゴリ名
//   4. レスポンス形式: { result: boolean, data: {...}, message: string }
//   5. エラーハンドリング: ステータスコード別の処理
export async function uploadPhotosInChunks(
  placeCode: string,
  siteCode: string,
  categoryName: string,
  updateCrew: string,
  files: { filename: string; blob: Blob }[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  // 10枚ずつのチャンクに分割
  const chunks: typeof files[] = [];
  for (let i = 0; i < files.length; i += 10) {
    chunks.push(files.slice(i, i + 10));
  }

  let completed = 0;
  const total = files.length;
  const parallelLimit = 3; // 同時に3チャンクまで並列処理

  // チャンクを3並列でアップロード
  for (let i = 0; i < chunks.length; i += parallelLimit) {
    const batch = chunks.slice(i, i + parallelLimit);

    await Promise.all(
      batch.map(async chunk => {
        try {
          // TODO: 実際のAPI呼び出しに置き換える
          await uploadPhotos(placeCode, siteCode, categoryName, updateCrew, chunk);
          completed += chunk.length;
          onProgress?.(completed, total);
        } catch (error) {
          console.error('Upload chunk failed:', error);
          completed += chunk.length;
          onProgress?.(completed, total);
          // TODO: エラー時のリトライ処理を追加
        }
      })
    );
  }
}
