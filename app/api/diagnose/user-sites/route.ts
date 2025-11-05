import { siteIncludesUserDetailed } from "@/lib/sites/match";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id") ?? "0") || undefined;
  const name = searchParams.get("name") ?? undefined;

  // 1) ユーザーキー取得
  const baseUrl = `http://localhost:${process.env.PORT || 3002}`;
  const ukRes = await fetch(`${baseUrl}/api/stg-user-keys?${id ? `id=${id}` : `name=${encodeURIComponent(name || "")}`}`, { cache: "no-store" });
  const uk = await ukRes.json();
  const user = uk?.user ?? null;

  // 2) 現場データ（DW → STG fallback）
  let provider: "dandori" | "stg";
  let sites: any[] = [];
  try {
    const r = await fetch(`${baseUrl}/api/dandori/sites`, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j?.data) && j.data.length) { sites = j.data; provider = "dandori" as const; }
    }
  } catch {}
  if (!sites.length) {
    const r2 = await fetch(`${baseUrl}/api/stg-sites?limit=200`, { cache: "no-store" });
    const j2 = await r2.json().catch(() => ({}));
    sites = j2?.sites ?? [];
    provider = "stg";
  }

  // 3) 照合して理由を付ける
  const reasons: any[] = [];
  let matchCount = 0;
  if (user) {
    for (const s of sites.slice(0, 50)) { // 上位50件で十分
      const m = siteIncludesUserDetailed(s, { id: user.id, employee_code: user.employee_code, login_id: user.login_id });
      if (m.matched) { matchCount++; reasons.push({ id: s.id, name: s.name, reason: m.reason }); }
    }
  }

  return Response.json({
    input: { id, name },
    user,
    provider,
    totalSites: sites.length,
    matchCount,
    samples: reasons.slice(0, 10), // 上位10件だけ
  });
}
