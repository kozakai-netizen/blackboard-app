import { NextResponse } from "next/server";
import { LRUCache } from 'lru-cache';
import { getDwToken } from '@/lib/dw/token';

const T_DW = 2500; // ms
const T_STG = 2500;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DW_BASE = process.env.NEXT_PUBLIC_DW_API_BASE || 'https://api.dandoli.jp/api';

// LRUキャッシュ: max=5,000 / TTL=10分 (旧DB用、互換性のため残す)
const userCache = new LRUCache<string, any>({
  max: 5000,
  ttl: 10 * 60 * 1000, // 10分
});

// DW API ユーザーキャッシュ (place単位)
const dwUsersCache = new LRUCache<string, Map<string, { name: string; username?: string }>>({
  max: 200,
  ttl: 10 * 60 * 1000, // 10分
});

let cacheHits = 0;
let dbFetches = 0;

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

/**
 * 現場データから member_keys を user_code ベースで生成
 */
function ensureMemberKeysFromSite(raw: any): string[] {
  const out = new Set<string>();
  const norm = (v: any) => (v ?? '').toString().trim();

  // manager.*（admin / sub_admin1-3 / chief / leader など想定）
  const m = raw?.manager || {};
  [m.admin, m.sub_admin1, m.sub_admin2, m.sub_admin3, m.chief, m.leader]
    .map(norm).filter(Boolean).forEach(v => out.add(v));

  // casts / workers が配列なら user_code を回収
  (Array.isArray(raw?.casts) ? raw.casts : []).forEach((x: any) => {
    const c = norm(x?.cast || x?.user_code);
    if (c) out.add(c);
  });
  (Array.isArray(raw?.workers) ? raw.workers : []).forEach((x: any) => {
    const c = norm(x?.worker || x?.user_code);
    if (c) out.add(c);
  });

  // 既に member_keys が来ていれば union
  (Array.isArray(raw?.member_keys) ? raw.member_keys : []).map(norm).filter(Boolean).forEach(v => out.add(v));

  return Array.from(out);
}

export async function GET(req: Request) {
  console.log('[quicklist] START');
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const statusKey = searchParams.get("status") || "progress";
  const status = toStatusList(statusKey); // "progress" → "1,2,3"
  const per = Math.min(80, Number(searchParams.get("per") || "50"));
  const placeCode = (searchParams.get("place") || "").trim() || process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1"; // ★必須
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
    let resp = dwToken
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
      if (all.length > 0) {
        console.log('[quicklist] DW first item keys:', Object.keys(all[0]));
        console.log('[quicklist] DW first item sample:', JSON.stringify(all[0], null, 2));
      }

      // DW API からユーザーマップ取得（キャッシュ付き）
      let usersMap: Map<string, { name: string; username?: string }>;
      try {
        usersMap = await getDwUsersMap(placeCode, dwToken);
        if (usersMap.size === 0) usersMapStatus = 'empty';
      } catch (e) {
        usersMapStatus = 'error';
        usersMap = new Map();
      }

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

        // member_keys を user_code ベースで生成（自分の現場判定用）
        const uniqueMemberKeys = ensureMemberKeysFromSite(site);

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
          member_keys: uniqueMemberKeys
        };
      });
      items = filterText(normalized, q).slice(0, per);
      provider = "dandori";
      console.log('[quicklist] DW items after filter:', items.length);
      if (items.length > 0) {
        console.log('[quicklist] Normalized first item:', JSON.stringify(items[0], null, 2));
      }
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
    debug: { dwStatus, dwUrl: dwUrlTried, retried, stgStatus, tokenSource, usersFrom: 'dw', usersMapStatus },
  }); // ← 必ず200
}

function resolveManager(managerId: string, byId: Map<string, any>, byUsername: Map<string, any>): string | undefined {
  if (!managerId) return undefined;

  const mid = String(managerId);
  const user = byId.get(mid) || byUsername.get(mid);

  return user?.name || `ID: #${mid}`;
}

function filterText(list: any[], q: string) {
  if (!q) return list;
  const n = q.toLowerCase();
  return list.filter((s: any) => {
    const hay = `${s?.site_name||""} ${s?.site_code||""} ${s?.address||""} ${s?.manager_name||""}`.toLowerCase();
    return hay.includes(n);
  });
}
