// app/api/stg-image-proxy/route.ts
/**
 * STG画像プロキシAPI
 *
 * STGの画像URLにJWT認証付きでアクセスし、画像をプロキシして返す
 * フロントエンドは /api/stg-image-proxy?real_path=xxx でアクセスできる
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const realPath = searchParams.get("real_path");

  console.log('🔍 [GET /api/stg-image-proxy] real_path:', realPath);

  if (!realPath) {
    console.error('❌ [GET /api/stg-image-proxy] real_path parameter required');
    return new Response(
      JSON.stringify({ error: "real_path parameter required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  try {
    // STG画像URL構築（CloudFront経由、認証不要）
    const imageUrl = `https://resource.dandoli.jp/resized/image/${realPath}`;

    console.log('📸 [stg-image-proxy] Fetching image:', imageUrl);

    // 画像を取得（認証不要）
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error('❌ [stg-image-proxy] Failed to fetch image:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${response.statusText}` }),
        { status: response.status, headers: { "content-type": "application/json" } }
      );
    }

    // 画像をBlobとして取得
    const blob = await response.blob();
    console.log('✅ [stg-image-proxy] Image fetched successfully, size:', blob.size);

    // 画像を返す
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600", // 1時間キャッシュ
      },
    });

  } catch (e: any) {
    console.error('❌ [GET /api/stg-image-proxy] Error:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'Unknown error' }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
