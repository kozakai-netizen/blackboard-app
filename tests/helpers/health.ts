import { test } from "@playwright/test";

/**
 * ヘルスチェックエンドポイントをポーリングして、インフラが準備できるまで待つ
 * @param baseURL ベースURL
 * @param timeoutMs タイムアウト（ミリ秒）デフォルト45秒
 * @returns { ok: true } または { ok: false, last: エラー詳細 }
 */
async function waitHealth(baseURL: string, timeoutMs = 45000): Promise<{ ok: boolean; last?: string; j?: any }> {
  const deadline = Date.now() + timeoutMs;
  let last = "";

  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${baseURL}/api/health/full`, { cache: "no-store" });
      last = `status=${r.status}`;

      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        if (j && j.ok !== false) {
          return { ok: true, j };
        }
        return { ok: false, last: "health-ok-false" };
      }
    } catch (e: any) {
      last = `err=${e?.message || e}`;
    }

    // 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return { ok: false, last };
}

/**
 * インフラ準備完了までポーリング待機し、準備できていない場合はテストをスキップする
 * @param t Playwrightのtestオブジェクト
 * @param baseURL ベースURL
 */
export async function gateInfra(t: typeof test, baseURL: string) {
  try {
    const result = await waitHealth(baseURL, 45000);

    if (!result.ok) {
      t.skip(true, `infra down: ${result.last || "timeout"}`);
      return;
    }

    console.log('✅ [Health Gate] DB connection OK, mode:', result.j?.mode);
  } catch (error: any) {
    t.skip(true, `infra down: ${error.message}`);
  }
}
