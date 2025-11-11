export function getDwToken(place?: string): { token?: string; source: 'map'|'env'|'none' } {
  try {
    const map = process.env.DW_PLACE_TOKENS ? JSON.parse(process.env.DW_PLACE_TOKENS) as Record<string,string> : {};
    if (place && map[place]) return { token: map[place], source: 'map' };
  } catch { /* ignore JSON error */ }
  if (process.env.DW_BEARER_TOKEN) return { token: process.env.DW_BEARER_TOKEN, source: 'env' };
  return { token: undefined, source: 'none' };
}
