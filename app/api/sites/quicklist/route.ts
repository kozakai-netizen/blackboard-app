import { NextResponse } from "next/server";
import mysql from 'mysql2/promise';
import { LRUCache } from 'lru-cache';

const T_DW = 2500; // ms
const T_STG = 2500;

// LRUキャッシュ: max=5,000 / TTL=10分
const userCache = new LRUCache<string, any>({
  max: 5000,
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

export async function GET(req: Request) {
  console.log('[quicklist] START');
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const statusKey = searchParams.get("status") || "progress";
  const status = toStatusList(statusKey); // "progress" → "1,2,3"
  const per = Math.min(80, Number(searchParams.get("per") || "50"));
  const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1";
  console.log('[quicklist] q:', q, 'statusKey:', statusKey, 'status:', status, 'per:', per);

  const timings: any = {};
  let items: any[] = [];
  let provider: "dandori" | "stg" | "none" = "none";

  // 1) DW
  try {
    const t0 = Date.now();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3002";
    const r = await withTimeout(
      fetch(`${baseUrl}/api/dandori/sites?place_code=${placeCode}&site_status=${encodeURIComponent(status)}`, { cache: "no-store" }),
      T_DW,
      "dw"
    );
    timings.dwStatus = (r as Response).status;
    if ((r as Response).ok) {
      const j: any = await (r as Response).json();
      console.log('[quicklist] DW response keys:', Object.keys(j), 'data type:', typeof j?.data, 'is array:', Array.isArray(j?.data));
      // DW APIは { data: [...] } 形式
      const all = Array.isArray(j?.data) ? j.data : [];
      if (all.length > 0) {
        console.log('[quicklist] DW first item keys:', Object.keys(all[0]));
        console.log('[quicklist] DW first item sample:', JSON.stringify(all[0], null, 2));
      }
      // ユーザーIDを収集（manager_idのみ抽出）
      const userIds = all
        .map((site: any) => site.manager?.admin)
        .filter((id: any) => id);

      // UNION ALL + LRUキャッシュでユーザー解決
      const { byId, byUsername } = await resolveUsersByKeys(userIds);

      // DW APIのフィールド名を正規化（SiteCardコンポーネント形式に合わせる）
      const normalized = all.map((site: any) => {
        const managerId = site.manager?.admin || "";
        const managerName = resolveManager(managerId, byId, byUsername);

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
          place_code: placeCode
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
        fetch(`${baseUrl}/api/stg-sites?limit=${per}&status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}`, { cache: "no-store" }),
        T_STG,
        "stg"
      );
      timings.stgStatus = (r as Response).status;
      if ((r as Response).ok) {
        const j: any = await (r as Response).json();
        const all = Array.isArray(j?.sites) ? j.sites : [];
        items = filterText(all, q).slice(0, per);
        provider = "stg";
      }
      timings.stgMs = Date.now() - t1;
    } catch (e: any) {
      timings.stgError = String(e?.message || e);
    }
  }

  console.log('[quicklist] RESULT provider:', provider, 'items:', items.length, 'timings:', timings);
  return NextResponse.json({
    ok: true,
    provider,
    total: items.length,
    items,
    timings,
  }); // ← 必ず200
}

/**
 * UNION ALL方式でユーザーを解決（チャンク500件）
 * id/login_id/employee_codeの3方向からマッチング
 */
async function resolveUsersByKeys(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.map(id => String(id)))).filter(Boolean);

  if (uniqueIds.length === 0) return { byId: new Map(), byLogin: new Map(), byEmp: new Map() };

  // キャッシュヒット確認
  const uncached: string[] = [];
  uniqueIds.forEach(id => {
    if (!userCache.has(id)) {
      uncached.push(id);
    } else {
      cacheHits++;
    }
  });

  // 未キャッシュ分をDBから取得
  if (uncached.length > 0) {
    let conn;
    try {
      conn = await mysql.createConnection({
        host: 'localhost',
        port: 13306,
        user: process.env.DB_USER || 'dandoliworks',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'dandolijp',
      });

      // 500件ずつチャンク分割
      const CHUNK_SIZE = 500;
      for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
        const chunk = uncached.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => '?').join(',');

        // UNION ALL で2方向から取得（id, username）
        const sql = `
          (SELECT u.id, u.username, CONCAT(p.user_last_name, p.user_first_name) AS name
           FROM users u LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.id IN (${placeholders}))
          UNION ALL
          (SELECT u.id, u.username, CONCAT(p.user_last_name, p.user_first_name) AS name
           FROM users u LEFT JOIN profiles p ON u.id = p.user_id
           WHERE u.username IN (${placeholders}))
        `;

        const params = [...chunk, ...chunk];
        const [rows] = await conn.query<any[]>(sql, params);

        // キャッシュに登録（id, usernameの2方向で登録）
        rows.forEach((user: any) => {
          const userObj = {
            id: String(user.id),
            username: String(user.username || ''),
            name: user.name,
          };

          // 2方向でキャッシュ登録
          if (user.id) userCache.set(String(user.id), userObj);
          if (user.username) userCache.set(String(user.username), userObj);
        });

        dbFetches += chunk.length;
      }
    } catch (e) {
      console.error('[quicklist] Failed to fetch users:', e);
    } finally {
      if (conn) await conn.end();
    }
  }

  // Map構築
  const byId = new Map<string, any>();
  const byUsername = new Map<string, any>();

  uniqueIds.forEach(id => {
    const user = userCache.get(id);
    if (user) {
      if (user.id) byId.set(user.id, user);
      if (user.username) byUsername.set(user.username, user);
    }
  });

  return { byId, byUsername };
}

/**
 * manager_idからユーザー名を段階的に解決
 * ① id一致 → ② username一致 → ③ フォールバック
 */
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
