import { NextRequest, NextResponse } from 'next/server';

const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE;
const DW_BEARER_TOKEN = process.env.DW_BEARER_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const placeCode = searchParams.get('place_code') || 'dandoli-sample1';

    console.log('🔵 Fetching users from DandoriWork API...', { placeCode });

    const response = await fetch(`${DW_API_BASE}/users?place_code=${placeCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DW_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DandoriWork API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Users fetched successfully:', data.data?.length || 0, 'users');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users from DandoriWork API' },
      { status: 500 }
    );
  }
}
