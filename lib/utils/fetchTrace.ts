export async function fetchTrace(input: RequestInfo, init?: RequestInit) {
  const url = typeof input === "string" ? input : (input as Request).url;
  const start = performance.now();
  try {
    const res = await fetch(input, init);
    const ms = Math.round(performance.now() - start);
    console.log("[fetch]", res.ok ? "OK" : "NG", res.status, url, ms + "ms");
    return res;
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    console.log("[fetch] ERR", url, ms + "ms", e);
    throw e;
  }
}
