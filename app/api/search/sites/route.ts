import { NextResponse } from "next/server";

const T_DW = 3000;
const T_STG = 2500;

const STATUS_MAP: Record<string, string> = {
  progress: "1,2,3",
  all: "",
  done: "5",
  after: "9",
  canceled: "-1"
};

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: timeout`)), ms))
  ]);
}

function toStatusList(key: string): string {
  return STATUS_MAP[key] ?? key;
}

export async function GET(req: Request) {
  console.log('[search] in');

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const per = Math.min(50, Math.max(10, Number(searchParams.get("per") || "20")));
  const uid = Number(searchParams.get("user_id") || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || 40824);
  const statusKey = searchParams.get("status") || "progress";
  const statusFilter = toStatusList(statusKey);

  const result = {
    ok: true,
    provider: "none",
    items: [] as any[],
    total: 0,
    page,
    per,
    effectiveUserId: uid,
    timings: { dwMs: 0, stgMs: 0, dwError: "", stgError: "" },
    error: ""
  };

  // 1) DW API を試す
  const t0 = Date.now();
  try {
    const dwBaseUrl = process.env.NEXT_PUBLIC_DW_API_BASE || 'https://api.dandoli.jp/api';
    const placeCode = process.env.NEXT_PUBLIC_PLACE_CODE || 'dandoli-sample1';
    const token = process.env.DW_BEARER_TOKEN || '';

    const statusParam = statusFilter || '1,2,3';
    const url = `${dwBaseUrl}/co/places/${placeCode}/sites?site_status=${statusParam}&limit=200`;

    const response = await withTimeout(
      fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }),
      T_DW,
      "DW"
    );

    result.timings.dwMs = Date.now() - t0;

    if (response.ok) {
      const data = await response.json();
      const sites: any[] = Array.isArray(data?.data) ? data.data : [];

      // キーワードフィルタリング
      let filtered = sites;
      if (q) {
        filtered = sites.filter(s => {
          const searchText = `${s?.name || ""} ${s?.site_code || ""} ${s?.address || ""} ${s?.customer?.name || ""}`;
          return searchText.toLowerCase().includes(q.toLowerCase());
        });
      }

      // ユーザーフィルタリング（uid指定時のみ）
      if (uid) {
        filtered = filtered.filter(s => includesUser(s, uid));
      }

      if (filtered.length > 0) {
        result.total = filtered.length;
        result.items = filtered
          .slice((page - 1) * per, page * per)
          .map(s => ({
            id: s?.site_code,
            name: s?.name,
            code: s?.site_code,
            status: getStatusName(s?.site_status),
            updated_at: s?.modified || s?.created,
            manager: s?.manager
          }));
        result.provider = "dandori";

        console.log(`[search] out - DW成功: ${result.items.length}件`);
        return NextResponse.json(result);
      }
    } else {
      result.timings.dwError = `HTTP ${response.status}`;
    }
  } catch (e: any) {
    result.timings.dwMs = Date.now() - t0;
    result.timings.dwError = e.message || "通信エラー";
    console.log(`[search] DW失敗: ${result.timings.dwError}`);
  }

  // 2) STG にフォールバック
  const t1 = Date.now();
  try {
    // STG API実装（今回はスキップ）
    result.timings.stgMs = Date.now() - t1;
  } catch (e: any) {
    result.timings.stgMs = Date.now() - t1;
    result.timings.stgError = e.message || "通信エラー";
    console.log(`[search] STG失敗: ${result.timings.stgError}`);
  }

  // 3) どちらもダメでも 200 で返す
  result.provider = "none";
  result.error = "該当する現場が見つかりませんでした";

  console.log(`[search] out - 結果なし`);
  return NextResponse.json(result);
}

function getStatusName(status: number | string): string {
  const statusMap: { [key: string]: string } = {
    '1': '現調中（見積未提出）',
    '2': '現調中（見積提出済み）',
    '3': '工事中',
    '4': '完工',
    '5': '中止・他決',
    '9': 'アフター'
  };
  return statusMap[String(status)] || String(status);
}

function includesUser(site: any, uid: number): boolean {
  const eq = (a: any, b: any) => {
    if (a == null || b == null) return false;
    return String(a).trim() === String(b).trim();
  };

  const mgr = site?.manager || {};

  // manager fields
  if (["admin", "sub_admin1", "sub_admin2", "sub_admin3", "chief", "leader"].some(k => eq(mgr[k], uid))) {
    return true;
  }

  // casts
  if (Array.isArray(site?.casts)) {
    if (site.casts.some((c: any) => eq(c?.user_id, uid) || eq(c?.id, uid))) {
      return true;
    }
  }

  // workers
  if (Array.isArray(site?.workers)) {
    if (site.workers.some((w: any) => eq(w?.user_id, uid) || eq(w?.id, uid))) {
      return true;
    }
  }

  // flat
  if (eq(site?.user_id, uid) || eq(site?.employee_code, uid)) {
    return true;
  }

  return false;
}
