import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/session
 * セッション情報（userId, selectedPlace）を返す
 */
export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '40824';
  const selectedPlace = cookieStore.get('selectedPlace')?.value;

  return NextResponse.json({
    userId,
    selectedPlace: selectedPlace || undefined,
  });
}
