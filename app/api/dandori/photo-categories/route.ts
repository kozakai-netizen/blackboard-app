// app/api/dandori/photo-categories/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeCode = searchParams.get('place_code');
    const siteCode = searchParams.get('site_code');

    if (!placeCode || !siteCode) {
      return NextResponse.json(
        { error: 'place_code and site_code are required' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_DW_API_BASE;
    const token = process.env.DW_BEARER_TOKEN;

    if (!baseUrl || !token) {
      console.error('Missing environment variables:', { hasBaseUrl: !!baseUrl, hasToken: !!token });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 現場写真のカテゴリ一覧を取得
    const url = `${baseUrl}/co/places/${placeCode}/sites/${siteCode}/site_photos/categories`;

    console.log('📸 Fetching photo categories from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📸 Photo categories response:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch photo categories', details: data },
        { status: response.status }
      );
    }

    // カテゴリ一覧を返す
    return NextResponse.json(data);

  } catch (error) {
    console.error('Photo categories API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
