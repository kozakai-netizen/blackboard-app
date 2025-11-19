/**
 * クライアントサイド用のユーザーキー照合関数
 * DB接続を含まないため、ブラウザで安全に実行できる
 */

export type Keys = {
  id?: string;
  username?: string;
  code?: string;
  all: string[]
};

/** 文字列正規化 */
const norm = (v: any): string => (v ?? '').toString().trim();

/** ローカルストレージから社員コードを取得 */
export function getLocalEmployeeCode(): string | undefined {
  if (typeof window === 'undefined') return;
  const v = localStorage.getItem('app.employee_code') || sessionStorage.getItem('app.employee_code');
  return norm(v) || undefined;
}

/** サーバーから取得したキーとローカル社員コードを合成 */
export function mergeMyKeys(serverKeys: {id?:string; username?:string; all?:string[]}): Keys {
  const code = getLocalEmployeeCode();
  const all = Array.from(new Set([...(serverKeys.all ?? []), code].filter(Boolean).map(norm)));
  return { ...serverKeys, code, all };
}

/** サイトのmanager/casts/workersなど「候補キー配列」を受け取り、自分のキーと突合 */
export function anyMatch(siteKeys: string[], my: Keys): { matched: boolean; reason?: string } {
  const s = new Set(siteKeys.map(norm));
  for (const k of my.all) {
    if (s.has(k)) return { matched: true, reason: `key:${k}` };
  }
  return { matched: false };
}
