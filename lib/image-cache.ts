// lib/image-cache.ts
// 画像URLの並列fetch合流: 同一URLの重複リクエストを1本にまとめる

// URLごとに進行中のPromiseを保持
const imageLoadCache = new Map<string, Promise<HTMLImageElement>>();

/**
 * 画像を読み込む（同一URLの並列リクエストを合流）
 * @param url 画像URL
 * @returns Promise<HTMLImageElement>
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  // すでに読み込み中なら、そのPromiseを返す（重複リクエスト防止）
  if (imageLoadCache.has(url)) {
    console.debug(`🎯 Image cache HIT (in-flight): ${url.slice(0, 50)}`);
    return imageLoadCache.get(url)!;
  }

  // 新規読み込み
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      console.debug(`✅ Image loaded: ${url.slice(0, 50)}`);
      imageLoadCache.delete(url); // 完了したらキャッシュから削除
      resolve(img);
    };

    img.onerror = () => {
      console.error(`❌ Image load failed: ${url.slice(0, 50)}`);
      imageLoadCache.delete(url); // エラーでもキャッシュから削除
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });

  imageLoadCache.set(url, promise);
  return promise;
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearImageCache() {
  imageLoadCache.clear();
  console.debug('🗑️ Image cache cleared');
}

/**
 * キャッシュ統計
 */
export function getImageCacheStats() {
  return {
    inFlight: imageLoadCache.size,
  };
}
