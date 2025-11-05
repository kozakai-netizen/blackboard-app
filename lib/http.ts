// lib/http.ts
// 壊れないfetchラッパー: 認証切れ/HTML応答/JSON parse失敗を可視化＋防御
// + タイムアウト防止 + AbortController対応

export async function fetchJSON(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 10000 // デフォルト10秒
) {
  const headers = new Headers(init.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // タイムアウト用 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    // ステータスコードチェック
    if (!res.ok) {
      console.warn(`❌ HTTP ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text.slice(0, 200)}`);
    }

    // Content-Type チェック（HTML応答を検出）
    if (!contentType.includes("application/json")) {
      console.warn(`⚠️ Non-JSON response (content-type=${contentType}) :: ${text.slice(0, 200)}`);
      throw new Error(`Non-JSON response (content-type=${contentType}) :: ${text.slice(0, 200)}`);
    }

    // JSON parse
    try {
      return JSON.parse(text);
    } catch (_err) {
      console.warn(`⚠️ JSON parse failed :: ${text.slice(0, 200)}`);
      throw new Error(`JSON parse failed :: ${text.slice(0, 200)}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);

    // タイムアウトエラー
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`⏱️ Request timeout after ${timeoutMs}ms`);
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw error;
  }
}

// 429/503のみ指数バックオフ再試行（最大3回）
export async function fetchJSONWithRetry(
  input: RequestInfo,
  init: RequestInit = {},
  maxRetries = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchJSON(input, init);
    } catch (err) {
      lastError = err as Error;
      const errorMessage = lastError.message;

      // 401/403は即エラー（認証問題）
      if (errorMessage.includes("HTTP 401") || errorMessage.includes("HTTP 403")) {
        console.error("🚫 認証エラー: 再試行しません", errorMessage);
        throw lastError;
      }

      // 429/503のみ再試行
      const shouldRetry =
        errorMessage.includes("HTTP 429") || errorMessage.includes("HTTP 503");

      if (!shouldRetry || attempt === maxRetries) {
        throw lastError;
      }

      // Jitter付きバックオフ（500ms * 2^attempt ± 25%）
      const baseDelay = 500 * Math.pow(2, attempt);
      const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
      const delay = baseDelay + jitter;

      console.debug(`🔄 Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
