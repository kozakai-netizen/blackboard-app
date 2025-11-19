/**
 * 現場一覧取得API（ロールベースフィルタリング）
 *
 * - 元請け（prime）: only=0で全現場、only=1で担当現場のみ
 * - 協力業者（sub）: 常に担当現場のみ（onlyパラメータ無視）
 * - v_my_sitesを使った高速な担当現場判定
 *
 * 詳細仕様: docs/dw-integration-spec.md を参照
 */
import { NextResponse } from "next/server";
import { LRUCache } from 'lru-cache';
import { getDwToken } from '@/lib/dw/token';
import { withSshMysql } from '@/lib/db/sshMysql';
import { getRoleForPlace, type UserRole } from '@/lib/auth/getRoleForPlace';

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

// === DB: site_id一括取得（v_my_sites - user_idベース） ===
async function fetchUserSitesMap(siteIds: string[]): Promise<{ map: Map<string, Set<string>>; error?: string }> {
  const map = new Map<string, Set<string>>();
  if (siteIds.length === 0) return { map };

  try {
    await withSshMysql(async (conn) => {
      // 大量の場合はチャンク
      const chunkSize = 500;
      for (let i = 0; i < siteIds.length; i += chunkSize) {
        const chunk = siteIds.slice(i, i + chunkSize);
        const [res] = await conn.query(
          `
            SELECT CAST(site_id AS CHAR) AS site_id,
                   CAST(user_id AS CHAR) AS user_id
            FROM v_my_sites
            WHERE site_id IN (?)
          `,
          [chunk]
        );

        const rows = res as Array<{ site_id: string; user_id: string }>;
        for (const r of rows) {
          if (!map.has(r.site_id)) map.set(r.site_id, new Set());
          map.get(r.site_id)!.add(r.user_id);
        }
      }
    });

    return { map };
  } catch (e: any) {
    console.error(`[quicklist] fetchUserSitesMap error:`, e.message);
    return { map, error: e.message };
  }
}

// === member_keys を DB の user_id から構築 ===
function attachMemberKeysFromDB(normalizedSites: any[], userSitesMap: Map<string, Set<string>>) {
  for (const site of normalizedSites) {
    const sid = extractSiteIdFromUrl(site?.url);
    const userIds = sid ? Array.from(userSitesMap.get(sid) ?? []) : [];
    const padded = userIds.map(pad8);
    site.member_keys = Array.from(new Set([...userIds, ...padded])); // 重複除去
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

// デフォルトステータス（未指定時）
const DEFAULT_STATUS_CODES = [1, 2, 3]; // 現調中（見積未提出）、現調中（見積提出済み）、工事中

function toStatusList(key: string): string {
  return STATUS_MAP[key] ?? key;
}

/**
 * ステータス配列をDW APIのクエリ文字列に変換
 * @param statusArray - ステータスコード配列（例: [1, 2, 3]）
 * @returns カンマ区切り文字列（例: "1,2,3"）
 */
function statusArrayToQueryString(statusArray: number[]): string {
  return statusArray.join(',');
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
  const per = Math.min(80, Number(searchParams.get("per") || "50"));
  const placeCode = (searchParams.get("place") || "").trim() || process.env.NEXT_PUBLIC_PLACE_CODE || "dandoli-sample1";

  // user_id 取得（セッション or クエリパラメータ）
  const userId = Number(searchParams.get("user_id") || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || 40824);

  // only パラメータ取得（0=全件, 1=自分の現場のみ）
  const onlyMine = searchParams.get("only") === "1";

  // ステータス配列の処理
  const statusParam = searchParams.get("status");
  let statusCodes: number[];

  if (!statusParam) {
    // 未指定時はデフォルト3ステータス
    statusCodes = DEFAULT_STATUS_CODES;
  } else if (statusParam === 'all') {
    // "all" の場合は全ステータス（空文字列）
    statusCodes = [];
  } else {
    // カンマ区切り文字列を配列に変換（例: "1,2,3" → [1,2,3]）
    statusCodes = statusParam.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));

    // 空配列の場合はデフォルトにフォールバック
    if (statusCodes.length === 0) {
      statusCodes = DEFAULT_STATUS_CODES;
    }
  }

  const statusQueryString = statusCodes.length > 0 ? statusArrayToQueryString(statusCodes) : '';

  console.log('[quicklist] q:', q, 'statusCodes:', statusCodes, 'statusQuery:', statusQueryString, 'per:', per, 'place:', placeCode, 'userId:', userId);

  const timings: any = {};
  let items: any[] = [];
  let provider: "dandori" | "stg" | "none" = "none";
  let hasDbWarning = false;

  // place_id 取得（place_codeから変換）
  // ※本来はDBまたは設定ファイルから取得すべきだが、今回は固定
  const placeIdMap: Record<string, number> = {
    'dandoli-sample1': 170,
  };
  const placeId = placeIdMap[placeCode] || 170;

  // ユーザーロール判定（元請け or 協力業者）
  let userRole: UserRole = 'unknown';
  try {
    userRole = await getRoleForPlace(userId, placeId);
    console.log(`[quicklist] User role: ${userRole} (userId=${userId}, placeId=${placeId})`);
  } catch (e: any) {
    console.error('[quicklist] ❌ getRoleForPlace error:', e.message);
    userRole = 'unknown';
  }

  // userRole が unknown の場合は500エラーを返す
  if (userRole === 'unknown') {
    console.error('[quicklist] ❌ ロール判定失敗: DB接続エラーまたは予期しないエラーが発生しました');
    return NextResponse.json({
      ok: false,
      error: 'role_determination_failed',
      message: 'ユーザーロールの判定に失敗しました。データベース接続を確認してください。',
      userId,
      placeId,
      userRole: 'unknown'
    }, { status: 500 });
  }

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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3001";

    const mkDwUrl = (buster?: string) => {
      const qs = new URLSearchParams({
        place_code: placeCode,
        site_status: statusQueryString, // ステータス配列対応
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

      // DBから一括取得（v_my_sites - user_idベース）
      const { map: userSitesMap, error: dbError } = await fetchUserSitesMap(siteIds);
      console.log(`[quicklist] fetchUserSitesMap returned ${userSitesMap.size} sites with user_ids`);

      if (dbError) {
        console.error(`[quicklist] ⚠️ DB接続エラー: ${dbError}`);
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

      // member_keys を DB 結果から付与（user_idベース）
      attachMemberKeysFromDB(normalized, userSitesMap);

      // ロールに基づくフィルタリング
      let filteredSites = normalized;

      if (userRole === 'sub') {
        // 協力業者: 担当現場のみに制限（v_my_sitesベース）

        // DBエラー時は安全側に倒す（0件 + エラーメッセージ）
        if (dbError) {
          console.error(`[quicklist] ❌ 協力業者モード: DB接続エラーのため0件を返します`);
          return NextResponse.json({
            ok: false,
            error: 'db_connection_failed',
            message: 'データベース接続エラーが発生しました。担当現場情報を取得できません。',
            userId,
            placeId,
            userRole,
            items: [],
            total: 0,
            timings: { ...t, dbError }
          }, { status: 500 });
        }

        const mySiteIds = new Set<string>();
        for (const [siteId, userIds] of userSitesMap.entries()) {
          if (userIds.has(String(userId)) || userIds.has(pad8(String(userId)))) {
            mySiteIds.add(siteId);
          }
        }

        filteredSites = normalized.filter((site: any) => {
          const sid = extractSiteIdFromUrl(site?.url);
          const isMySite = sid && mySiteIds.has(sid);

          if (!isMySite) {
            console.log(`[quicklist] 協力業者フィルター: site_id=${sid} は user_id=${userId} の担当外のためスキップ`);
          }

          return isMySite;
        });

        console.log(`[quicklist] 協力業者フィルター適用: ${normalized.length}件 → ${filteredSites.length}件`);
      } else {
        // 元請け: onlyMine=1の場合は担当現場のみに絞る

        // DBエラー時は警告フラグを立てて全件返す
        if (dbError) {
          console.warn(`[quicklist] ⚠️ 元請けモード: DB接続エラーですが全件を返します（onlyMineフィルタは動作しません）`);
          hasDbWarning = true;
        }

        if (onlyMine && !dbError) {
          // onlyMine=1 の場合、担当現場のみに絞る
          const mySiteIds = new Set<string>();
          for (const [siteId, userIds] of userSitesMap.entries()) {
            if (userIds.has(String(userId)) || userIds.has(pad8(String(userId)))) {
              mySiteIds.add(siteId);
            }
          }

          filteredSites = normalized.filter((site: any) => {
            const sid = extractSiteIdFromUrl(site?.url);
            return sid && mySiteIds.has(sid);
          });

          console.log(`[quicklist] 元請けユーザー: onlyMine=1 → ${normalized.length}件から${filteredSites.length}件に絞り込み`);
        } else {
          // onlyMine=0 または DBエラー時は全件返す
          filteredSites = normalized;
          console.log(`[quicklist] 元請けユーザー: 全${normalized.length}件を返します`);
        }
      }

      items = filterText(filteredSites, q).slice(0, per);
      provider = "dandori";

      console.log('[quicklist] DW items after filter:', items.length);

      // デバッグ情報
      const siteIdsQueried = siteIds.slice(0, 20);
      timings.siteCrewsLookup = {
        source: 'db-v_my_sites',
        siteIdsQueried,
        userSitesMapSites: userSitesMap.size,
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || "http://localhost:3001";
      const r = await withTimeout(
        fetch(`${baseUrl}/api/stg-sites?limit=${per}&status=${encodeURIComponent(statusQueryString)}&q=${encodeURIComponent(q)}&place=${encodeURIComponent(placeCode)}`, { cache: "no-store" }),
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

  // 🔍 FINAL レスポンスログ（デバッグ用）
  console.log('[quicklist] FINAL items length:', items.length, 'userRole:', userRole, 'userId:', userId, 'only:', onlyMine, 'statusCodes:', statusCodes);

  return NextResponse.json({
    ok: provider !== 'none',
    provider,
    place: placeCode,
    placeId,
    userId,
    userRole, // 元請け("prime") or 協力業者("sub")
    statusCodes, // 適用されたステータスコード配列
    total: items.length,
    items,
    error,
    dbWarning: hasDbWarning, // DB接続エラー時の警告フラグ（元請けのみ）
    timings,
    debug: {
      dwStatus,
      dwUrl: dwUrlTried,
      retried,
      stgStatus,
      tokenSource,
      usersFrom: 'dw',
      usersMapStatus,
      siteCrewsLookup: timings.siteCrewsLookup || { source: 'n/a', siteIdsQueried: [], userSitesMapSites: 0 }
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
