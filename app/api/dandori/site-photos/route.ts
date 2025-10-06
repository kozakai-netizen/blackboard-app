import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('📸 Photo upload API called');

  try {
    const formData = await request.formData();
    const siteCode = formData.get('site_code');
    const categoryName = formData.get('category_name');
    const file = formData.get('data[files][]') as File;

    // リクエストパラメータのログ
    console.log('📸 Request parameters:', {
      siteCode,
      categoryName,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!siteCode || !categoryName || !file) {
      console.error('❌ Missing required fields:', { siteCode, categoryName, hasFile: !!file });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE;
    const bearerToken = process.env.DW_BEARER_TOKEN;
    const baseUrl = process.env.NEXT_PUBLIC_DW_API_BASE;

    // 環境変数の確認
    console.log('📸 Environment check:', {
      hasBaseUrl: !!baseUrl,
      hasToken: !!bearerToken,
      placeCode
    });

    // ダンドリワークAPIにフォワード
    const apiUrl = `${baseUrl}/co/places/${placeCode}/sites/${siteCode}/site_photos`;

    const apiFormData = new FormData();
    apiFormData.append('category_name', categoryName as string);
    apiFormData.append('data[files][]', file);
    apiFormData.append('update_crew', 'user1'); // 仮のユーザー

    console.log('📸 Uploading to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      },
      body: apiFormData
    });

    console.log('📸 Response status:', response.status);

    // レスポンスのContent-Typeを確認
    const contentType = response.headers.get('content-type');
    console.log('📸 Content-Type:', contentType);

    if (!response.ok) {
      // まずテキストとして取得
      const errorText = await response.text();
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        errorPreview: errorText.substring(0, 500)
      });

      // HTMLエラーの場合は詳細を抽出
      let errorMessage = 'Upload failed';
      if (contentType?.includes('text/html')) {
        errorMessage = 'API returned HTML error (Internal Server Error)';
      }

      return NextResponse.json(
        {
          error: errorMessage,
          status: response.status,
          details: errorText.substring(0, 500)
        },
        { status: response.status }
      );
    }

    // 成功時はJSONをパース
    const responseText = await response.text();
    console.log('📸 Response text preview:', responseText.substring(0, 200));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('📸 Upload response:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      console.error('❌ Response text:', responseText);
      return NextResponse.json(
        {
          error: 'Invalid JSON response from API',
          details: responseText.substring(0, 500)
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const siteCode = searchParams.get('site_code');

  if (!siteCode) {
    return NextResponse.json(
      { error: 'site_code is required' },
      { status: 400 }
    );
  }

  const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE;
  const bearerToken = process.env.DW_BEARER_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_DW_API_BASE;

  const apiUrl = `${baseUrl}/co/places/${placeCode}/sites/${siteCode}/site_photos`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Fetch photos error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}
