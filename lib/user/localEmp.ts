/**
 * ローカルストレージから社員コードを取得・展開（暫定実装）
 */

export function getLocalEmpCode(): string {
  if (typeof window === 'undefined') return '';
  const v = (localStorage.getItem('dw:empcode') || '').trim();
  return v;
}

export function expandEmpKeys(code?: string): string[] {
  const c = (code || '').trim();
  if (!c) return [];
  const padded = /^\d+$/.test(c) ? c.padStart(8, '0') : '';
  return Array.from(new Set([c, padded].filter(Boolean)));
}
