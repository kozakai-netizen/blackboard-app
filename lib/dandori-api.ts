// lib/dandori-api.ts
import type { DandoriSite, DandoriUploadResponse } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE!;

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

export async function uploadPhotosInChunks(
  placeCode: string,
  siteCode: string,
  categoryName: string,
  updateCrew: string,
  files: { filename: string; blob: Blob }[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  const chunks: typeof files[] = [];
  for (let i = 0; i < files.length; i += 10) {
    chunks.push(files.slice(i, i + 10));
  }

  let completed = 0;
  const total = files.length;
  const parallelLimit = 3;

  for (let i = 0; i < chunks.length; i += parallelLimit) {
    const batch = chunks.slice(i, i + parallelLimit);

    await Promise.all(
      batch.map(async chunk => {
        try {
          await uploadPhotos(placeCode, siteCode, categoryName, updateCrew, chunk);
          completed += chunk.length;
          onProgress?.(completed, total);
        } catch (error) {
          console.error('Upload chunk failed:', error);
          completed += chunk.length;
          onProgress?.(completed, total);
        }
      })
    );
  }
}
