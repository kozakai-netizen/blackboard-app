import { NextRequest, NextResponse } from 'next/server';

const DW_API_BASE = process.env.NEXT_PUBLIC_DW_API_BASE;
const BEARER_TOKEN = process.env.DW_BEARER_TOKEN;

/**
 * ユーザーが参加している現場一覧を取得
 * 各現場の site_crews API を叩いて、指定されたユーザーが含まれているかチェック
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeCode = searchParams.get('place_code');
    const userId = searchParams.get('user_id');

    if (!placeCode || !userId) {
      return NextResponse.json(
        { error: 'place_code and user_id are required' },
        { status: 400 }
      );
    }

    console.log('👥 Fetching user sites:', { placeCode, userId });

    // まず全現場を取得
    const sitesUrl = `${DW_API_BASE}/co/places/${placeCode}/sites`;
    const sitesResponse = await fetch(sitesUrl, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    if (!sitesResponse.ok) {
      throw new Error(`Sites API error: ${sitesResponse.status}`);
    }

    const sitesData = await sitesResponse.json();

    if (!sitesData.result || !sitesData.data) {
      return NextResponse.json({
        result: false,
        data: [],
        message: 'No sites found'
      });
    }

    console.log(`📊 Total sites: ${sitesData.data.length}`);

    // 各現場の site_crews を取得して、ユーザーが参加しているかチェック
    const userSites = [];

    for (const site of sitesData.data) {
      const siteCode = site.site_code;
      if (!siteCode) continue;

      try {
        const crewsUrl = `${DW_API_BASE}/co/places/${placeCode}/sites/${siteCode}/site_crews`;
        const crewsResponse = await fetch(crewsUrl, {
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
          },
        });

        if (!crewsResponse.ok) {
          console.warn(`⚠️ Failed to fetch crews for site ${siteCode}: ${crewsResponse.status}`);
          continue;
        }

        const crewsData = await crewsResponse.json();

        if (!crewsData.result || !crewsData.data) {
          continue;
        }

        const crews = crewsData.data;

        // workers または casts にユーザーが含まれているかチェック
        const isWorker = crews.workers?.some((w: any) => w.worker === userId);
        const isCast = crews.casts?.some((c: any) => c.cast === userId);

        if (isWorker || isCast) {
          console.log(`✅ User ${userId} is in site ${siteCode}`);
          userSites.push(site);
        }
      } catch (error) {
        console.error(`❌ Error checking crews for site ${siteCode}:`, error);
      }
    }

    console.log(`👥 User ${userId} is in ${userSites.length} sites`);

    return NextResponse.json({
      result: true,
      data: userSites,
      message: 'Success'
    });

  } catch (error) {
    console.error('❌ User sites API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user sites' },
      { status: 500 }
    );
  }
}
