// lib/url/uploadParams.ts
/**
 * アップロード画面のURLパラメータ型定義と解析ユーティリティ
 */

export type UploadParams = {
  source?: string;          // 'stg' 期待
  siteCode?: string;
  placeCode?: string;
  categoryId?: number | null; // 例: 200 (STG)
  photoIds: number[];       // 選択ID
  debug: boolean;
};

/**
 * URLSearchParamsからアップロード画面用のパラメータを厳密に解析
 */
export function parseUploadParams(search: string): UploadParams {
  const q = new URLSearchParams(search);
  const source = q.get("source") ?? undefined;
  const siteCode = q.get("site_code") ?? undefined;
  const placeCode = q.get("place_code") ?? undefined;

  const cat = q.get("category_id");
  const categoryId = cat ? Number(cat) : null;

  const photoIdsRaw = (q.get("photo_ids") ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  // 数値化＋重複排除
  const pids = Array.from(new Set(photoIdsRaw.map(n => Number(n)).filter(n => Number.isFinite(n))));

  const debug = q.get("debug") === "1";

  return { source, siteCode, placeCode, categoryId, photoIds: pids, debug };
}
