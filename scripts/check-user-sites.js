const DW_API_BASE = 'https://api.dandoli.jp/api';
const BEARER_TOKEN = '4b8dfcab74cc1b3fac4cd523d01ac6a4';
const PLACE_CODE = 'dandoli-sample1';
const USER_ID = '40824'; // kozakai

async function checkUserSites() {
  console.log(`\n🔍 Checking sites for user: ${USER_ID}\n`);

  try {
    // 全現場を取得
    const sitesUrl = `${DW_API_BASE}/co/places/${PLACE_CODE}/sites`;
    const sitesResponse = await fetch(sitesUrl, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    const sitesData = await sitesResponse.json();
    const sites = sitesData.data || [];

    console.log(`📊 Total sites: ${sites.length}\n`);

    // 各現場の site_crews をチェック
    let userSiteCount = 0;
    const userSiteCodes = [];

    for (let i = 0; i < Math.min(sites.length, 10); i++) { // 最初の10件のみチェック
      const site = sites[i];
      const siteCode = site.site_code;

      if (!siteCode) continue;

      try {
        const crewsUrl = `${DW_API_BASE}/co/places/${PLACE_CODE}/sites/${siteCode}/site_crews`;
        const crewsResponse = await fetch(crewsUrl, {
          headers: {
            'Authorization': `Bearer ${BEARER_TOKEN}`,
          },
        });

        if (!crewsResponse.ok) {
          console.log(`⚠️  Site ${siteCode}: API error ${crewsResponse.status}`);
          continue;
        }

        const crewsData = await crewsResponse.json();

        if (!crewsData.result || !crewsData.data) {
          console.log(`ℹ️  Site ${siteCode} (${site.name}): No crews data`);
          continue;
        }

        const crews = crewsData.data;
        const workers = crews.workers || [];
        const casts = crews.casts || [];

        const isWorker = workers.some(w => w.worker === USER_ID);
        const isCast = casts.some(c => c.cast === USER_ID);

        if (isWorker || isCast) {
          userSiteCount++;
          userSiteCodes.push(siteCode);
          console.log(`✅ Site ${siteCode} (${site.name}): User is ${isWorker ? 'worker' : 'cast'}`);
        } else {
          console.log(`❌ Site ${siteCode} (${site.name}): User not in crews`);
        }
      } catch (error) {
        console.error(`❌ Error checking site ${siteCode}:`, error.message);
      }
    }

    console.log(`\n📊 Summary: User ${USER_ID} is in ${userSiteCount} sites (out of ${Math.min(sites.length, 10)} checked)`);
    console.log(`\n📝 User site codes:`, userSiteCodes);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserSites();
