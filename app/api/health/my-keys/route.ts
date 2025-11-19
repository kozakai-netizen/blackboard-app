/**
 * GET /api/health/my-keys?uid=<uid>&place=<place>
 * place パラメータが正しく届くかを確認するヘルスチェック
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const uid = (searchParams.get('uid') || '').trim();
  const place = (searchParams.get('place') || '').trim() || 'dandoli-sample1';
  const emp = (searchParams.get('emp') || '').trim();

  console.info('[health/my-keys] echo', { uid, place, emp });

  return Response.json({
    ok: true,
    echo: { uid, place, emp },
    timestamp: new Date().toISOString()
  });
}
