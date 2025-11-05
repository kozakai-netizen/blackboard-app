// app/api/dandori/upload/route.ts
// TODO: ダンドリワーク現場写真アップロードAPI（BFF実装）
// 【現状】
// - Bearer Tokenを秘匿するためのBFF（Backend for Frontend）として機能
// - フロントエンドからのリクエストを受け取り、ダンドリワークAPIへ転送
// - 実際のアップロード処理は未実装（モック）
//
// 【将来実装】
// - エンジニアからAPI詳細を受領後、実装を完了させる
// - 必要な実装:
//   1. リクエストバリデーション（ファイルサイズ、形式チェック）
//   2. エラーハンドリングの強化（リトライ処理、タイムアウト設定）
//   3. レスポンスの正規化（共通フォーマット）
//   4. ログ出力の最適化（本番環境では機密情報を隠す）
//   5. レート制限の実装（過度なリクエスト防止）
import { NextRequest, NextResponse } from 'next/server';

const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE!;
const BEARER_TOKEN = process.env.DW_BEARER_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const placeCode = formData.get('place_code') as string;
    const siteCode = formData.get('site_code') as string;
    const categoryName = formData.get('category_name') as string;
    const updateCrew = formData.get('update_crew') as string;

    // TODO: バリデーション追加（必須パラメータチェック、ファイル数制限など）
    const dwFormData = new FormData();
    dwFormData.set('category_name', encodeURIComponent(categoryName));
    dwFormData.set('update_crew', updateCrew);

    const files = formData.getAll('files');
    files.slice(0, 10).forEach(file => {
      dwFormData.append('data[files][]', file);
    });

    const url = `${DW_API_BASE}/co/places/${placeCode}/sites/${siteCode}/site_photos`;

    console.log('📸 Upload API called');
    console.log('📸 Request:', { placeCode, siteCode, categoryName, updateCrew, fileCount: files.length });
    console.log('📸 URL:', url);

    // TODO: 実際のAPI呼び出しに置き換える（現在はモック）
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      },
      body: dwFormData
    });

    console.log('📸 Response status:', response.status);

    // まずテキストで取得してからJSONをパース
    const responseText = await response.text();
    console.log('📸 Response preview:', responseText.substring(0, 200));

    if (!response.ok) {
      console.error('❌ Upload failed:', { status: response.status, preview: responseText.substring(0, 500) });
      // TODO: エラーレスポンスの正規化（クライアント側で扱いやすい形式に）
      return NextResponse.json(
        { error: 'Upload failed', details: responseText.substring(0, 500) },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Upload error:', error);
    // TODO: エラーログを本番環境用に最適化（機密情報を隠す）
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
