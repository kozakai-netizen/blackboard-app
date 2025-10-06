// app/api/dandori/upload/route.ts
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
      return NextResponse.json(
        { error: 'Upload failed', details: responseText.substring(0, 500) },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
