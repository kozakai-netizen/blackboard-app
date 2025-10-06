// app/api/dandori/sites/route.ts
import { NextRequest, NextResponse } from 'next/server';

const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE!;
const BEARER_TOKEN = process.env.DW_BEARER_TOKEN!;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeCode = searchParams.get('place_code');

    if (!placeCode) {
      return NextResponse.json(
        { error: 'place_code is required' },
        { status: 400 }
      );
    }

    const url = `${DW_API_BASE}/co/places/${placeCode}/sites`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sites', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Sites fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
