import { NextResponse } from "next/server";
import { LRUCache } from 'lru-cache';
import { getDwToken } from '@/lib/dw/token';
import mysql from 'mysql2/promise';

const T_DW = 2500; // ms
const T_STG = 2500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DW_BASE = process.env.NEXT_PUBLIC_DW_API_BASE || 'https://api.dandoli.jp/api';

// === helpers: site_id 抽出 & ゼロ詰め ===
const pad8 = (s: string) => (s || '').padStart(8, '0');

function extractSiteIdFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/\/sites\/(\d+)\//);
  return m?.[1];
}

// === DB: site_id一括取得（sites_crews） ===
async function fetchCrewMapBySiteIds(siteIds: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (siteIds.length === 0) return map;

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 13306,
      user: process.env.DB_USER || 'dandoliworks',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dandolijp',
    });

    // 大量の場合はチャンク
    const chunkSize = 500;
    for (let i = 0; i < siteIds.length; i += chunkSize) {
      const chunk = siteIds.slice(i, i + chunkSize);
      const [res] = await conn.query(
        `
          SELECT CAST(site_id AS CHAR) AS site_id,
                 CAST(crew_id AS CHAR) AS crew_id,
                 COALESCE(user_level, 0) AS user_level
          FROM sites_crews
          WHERE site_id IN (?)
            AND deleted = 0
            AND COALESCE(user_level, 0) IN (1,2,3)
        `,
        [chunk]
      );

      const rows = res as Array<{ site_id: string; crew_id: string; user_level: number }>;
      for (const r of rows) {
        if (!map.has(r.site_id)) map.set(r.site_id, new Set());
        map.get(r.site_id)!.add(r.crew_id);
      }
    }

    return map;
  } catch (e: any) {
    console.warn(`[quicklist] fetchCrewMapBySiteIds error:`, e.message);
    return map;
  } finally {
    try { await conn?.end(); } catch {}
  }
}

// === member_keys を DB の user_id から構築 ===
function attachMemberKeysFromDB(normalizedSites: any[], crewMap: Map<string, Set<string>>) {
  for (const site of normalizedSites) {
    const sid = extractSiteIdFromUrl(site?.url);
    const ids = sid ? Array.from(crewMap.get(sid) ?? []) : [];
    const padded = ids.map(pad8);
    site.member_keys = Array.from(new Set([...ids, ...padded])); // 重複除去
  }
}

// DW API ユーザーキャッシュ (place単位)
const dwUsersCache = new LRUCache<string, Map<string, { name: string; username?: string }>>({
  max: 200,
  ttl: 10 * 60 * 1000, // 10分
});

const STATUS_MAP: Record<string, string> = {
  progress: "1,2,3",
  all: "",
  done: "5",
  after: "9",
  canceled: "-1"
};

// ステータスコード → 名称
const STATUS_NAME_MAP: Record<number, string> = {
  1: "現調中（見積未提出）",
  2: "現調中（見積提出済み）",
  3: "工事中",
  5: "完工",
  9: "アフター",
  [-1]: "中止・他決"
};

function toStatusList(key: string): string {
  return STATUS_MAP[key] ?? key;
}

function toStatusName(code: number): string {
  return STATUS_NAME_MAP[code] ?? `ステータス${code}`;
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string) {
  return Promise.race([
    p,
    new Promise<T>((_, r) => setTimeout(() => r(new Error(`${label}: timeout`) as any), ms)),
  ]);
}

/**
 * DW APIからplace内のユーザー一覧を取得（キャッシュ付き）
 */
async function getDwUsersMap(placeCode: string, token?: string): Promise<Map<string, { name: string; username?: string }>> {
  const cacheKey = `dw-users:${placeCode}`;
  const cached = dwUsersCache.get(cacheKey);
  if (cached) {
    console.log(`[quicklist] DW users cache hit for place=${placeCode}`);
    return cached;
  }

  // トークン解決（共通 or place個別）
  const { token: bearer, source } = getDwToken(placeCode);
  const useToken = token || bearer;
  if (!useToken) {
    console.warn('[quicklist] no DW token, users map empty', { placeCode, source });
    const empty = new Map<string, { name: string; username?: string }>();
    dwUsersCache.set(cacheKey, empty);
    return empty;
  }

  // place内ユーザー一覧を一発取得
  console.log(`[quicklist] Fetching DW users for place=${placeCode}`);
  try {
    const res = await fetch(`${DW_BASE}/co/places/${encodeURIComponent(placeCode)}/users`, {
      headers: { Authorization: `Bearer ${useToken}` },
      cache: 'no-store'
    });

    const map = new Map<string, { name: string; username?: string }>();
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const list = Array.isArray(json?.data) ? json.data : [];
      console.log(`[quicklist] DW users fetched: ${list.length} users`);
      for (const u of list) {
        const code = String(u?.user_code ?? '').trim();
        if (!code) continue;
        const name = `${u?.user_last_name ?? ''}${u?.user_first_name ?? ''}`.trim();
        map.set(code, { name, username: u?.username });
      }
    } else {
      console.warn('[quicklist] DW users fetch failed', { placeCode, status: res.status });
    }

    dwUsersCache.set(cacheKey, map);
    return map;
  } catch (e: any) {
    console.error('[quicklist] DW users fetch error', { placeCode, error: e?.message });
    const empty = new Map<string, { name: string; username?: string }>();
    dwUsersCache.set(cacheKey, empty);
    return empty;
  }
}

export async function GET(req: Request) {
  console.log('[quicklist] START');
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const statusKey = searchParams.get("status") || "progress";
  const status = toStatusList(statusKey); // "progress" → "1,2,3"
  const per = Math.min(80, Number(searchParams.get("per") || "50"));
  const placeCode = (searchParams.get("place") || "").trim() || process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1";
  console.log('[quicklist] q:', q, 'statusKey:', statusKey, 'status:', status, 'per:', per, 'place:', placeCode);

  const timings: any = {};
  let items: any[] = [];
  let provider: "dandori" | "stg" | "none" = "none";

  // 1) DW（404/4xx/5xxリトライ付き）
  let dwStatus = 0, stgStatus = 0;
  let dwUrlTried = '';
  let retried = false;
  let error: string | undefined;
  const { token: dwToken, source: tokenSource } = getDwToken(placeCode);
  let usersMapStatus: 'ok' | 'empty' | 'error' = 'ok'; // DW API usersMap状態

  const parseOk = async (r: Response) => {
    try {
      const j = await r.json();
      return Array.isArray(j?.data) ? j.data : (j?.items || []);
    } catch {
      error = 'invalid_json';
      return null;
    }
  };

  try {
    const t0 = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3002";

    const mkDwUrl = (buster?: string) => {
      const qs = new URLSearchParams({
        place_code: placeCode,
        site_status: status,
      });
      if (buster) qs.set('_', buster);
      return `${baseUrl}/api/dandori/sites?${qs.toString()}`;
    };

    const dwUrl = mkDwUrl();
    dwUrlTried = dwUrl;

    // 1回目のfetch
    const resp = dwToken
      ? await withTimeout(
          fetch(dwUrl, { cache: "no-store", next: { revalidate: 0 } }),
          T_DW,
          "dw"
        ) as Response
      : new Response(null, { status: 499 }) as Response;

    dwStatus = resp.status;
    timings.dwStatus = dwStatus;

    let data = resp.ok ? await parseOk(resp) : null;

    // 404 or 4xx/5xx OR invalid_json の場合は800ms待機して1回だけリトライ
    if (!resp.ok || data === null) {
      retried = true;
      console.warn(`[quicklist] DW ${dwStatus}, retrying after 800ms with cache-buster...`);
      await sleep(800);
      const dw2Url = mkDwUrl(Date.now().toString());
      dwUrlTried = dw2Url;

      const resp2 = await withTimeout(
        fetch(dw2Url, { cache: "no-store", next: { revalidate: 0 } }),
        T_DW,
        "dw-retry"
      ) as Response;

      dwStatus = resp2.status;
      timings.dwStatus = dwStatus;

      data = resp2.ok ? await parseOk(resp2) : null;

      if (!resp2.ok || data === null) {
        console.error('[quicklist] DW retry failed', { status: resp2.status, error });
        // STG fallback へ進む
      }
    }

    // データがあればitemsに格納
    if (Array.isArray(data) && data.length > 0) {
      console.log('[quicklist] DW success, data length:', data.length);
      const all = data;

      // DW API からユーザーマップ取得（キャッシュ付き）
      let usersMap: Map<string, { name: string; username?: string }>;
      try {
        usersMap = await getDwUsersMap(placeCode, dwToken);
        if (usersMap.size === 0) usersMapStatus = 'empty';
      } catch {
        usersMapStatus = 'error';
        usersMap = new Map();
      }

      // すべてのsite_idを集める
      const siteIdSet = new Set<string>();
      for (const site of all) {
        const sid = extractSiteIdFromUrl(site?.url);
        if (sid) siteIdSet.add(sid);
      }
      const siteIds = Array.from(siteIdSet);
      console.log(`[quicklist] Extracted ${siteIds.length} unique site_ids from ${all.length} sites`);

      // DBから一括取得
      const crewMap = await fetchCrewMapBySiteIds(siteIds);
      console.log(`[quicklist] fetchCrewMapBySiteIds returned ${crewMap.size} sites with crews`);

      // DW APIのフィールド名を正規化（SiteCardコンポーネント形式に合わせる）
      const normalized = all.map((site: any) => {
        // 担当者名を usersMap から解決
        const managerId = String(site.manager?.admin ?? '').trim();
        const managerName = managerId
          ? (usersMap.get(managerId)?.name || `ID: #${managerId}`)
          : '';

        // 現場種類の名称マッピング（仮）
        const siteTypeMap: Record<number, string> = {
          1: "新築",
          2: "リフォーム",
          3: "修繕",
          4: "その他"
        };

        // 住所を組み立て（addressが空の場合はaddress_detailから生成）
        let address = site.address || "";
        if (!address && site.address_detail) {
          const d = site.address_detail;
          const parts = [d.pref_name, d.city, d.address1, d.address2].filter(Boolean);
          address = parts.join("");
        }

        return {
          site_code: site.site_code || "",
          site_name: site.name || "(名称未設定)",
          site_type: site.site_type ? siteTypeMap[site.site_type] || `種別${site.site_type}` : undefined,
          status: toStatusName(site.site_status),
          updated_at: site.site_end_date || site.site_start_date || "",
          address: address || undefined,
          manager_name: managerName,
          manager_id: managerId,
          place_code: placeCode,
          url: site.url // site_id 抽出用にurlを保持
        };
      });

      // member_keys を DB 結果から付与
      attachMemberKeysFromDB(normalized, crewMap);

      items = filterText(normalized, q).slice(0, per);
      provider = "dandori";

      console.log('[quicklist] DW items after filter:', items.length);

      // デバッグ情報
      const siteIdsQueried = siteIds.slice(0, 20);
      timings.siteCrewsLookup = {
        source: 'db-sites_crews',
        siteIdsQueried,
        crewMapSites: crewMap.size,
      };
    }
    timings.dwMs = Date.now() - t0;
  } catch (e: any) {
    timings.dwError = String(e?.message || e);
  }

  // 2) STG fallback（DWが0件または失敗）
  if (items.length === 0) {
    try {
      const t1 = Date.now();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3002";
      const r = await withTimeout(
        fetch(`${baseUrl}/api/stg-sites?limit=${per}&status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&place=${encodeURIComponent(placeCode)}`, { cache: "no-store" }),
        T_STG,
        "stg"
      );
      stgStatus = (r as Response).status;
      timings.stgStatus = stgStatus;
      if ((r as Response).ok) {
        const j: any = await (r as Response).json();
        const all = Array.isArray(j?.sites) ? j.sites : [];
        items = filterText(all, q).slice(0, per);
        provider = "stg";
      }
      timings.stgMs = Date.now() - t1;
    } catch (e: any) {
      timings.stgError = String(e?.message || e);
      stgStatus = -1;
    }
  }

  console.log('[quicklist] RESULT provider:', provider, 'items:', items.length, 'timings:', timings);
  return NextResponse.json({
    ok: provider !== 'none',
    provider,
    place: placeCode,
    total: items.length,
    items,
    error,
    timings,
    debug: {
      dwStatus,
      dwUrl: dwUrlTried,
      retried,
      stgStatus,
      tokenSource,
      usersFrom: 'dw',
      usersMapStatus,
      siteCrewsLookup: timings.siteCrewsLookup || { source: 'n/a', siteIdsQueried: [], crewMapSites: 0 }
    },
  }); // ← 必ず200
}

function filterText(list: any[], q: string) {
  if (!q) return list;
  const n = q.toLowerCase();
  return list.filter((s: any) => {
    const hay = `${s?.site_name||""} ${s?.site_code||""} ${s?.address||""} ${s?.manager_name||""}`.toLowerCase();
    return hay.includes(n);
  });
}
