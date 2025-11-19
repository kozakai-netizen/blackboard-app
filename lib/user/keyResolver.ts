import { LRUCache } from 'lru-cache';
import { withSshMysql } from '@/lib/db/sshMysql';

export type Keys = {
  id?: string;
  username?: string;
  employee_code?: string;  // ★必須フィールド
  all: string[];           // id/username/employee_code/000埋めの和集合
};

const cache = new LRUCache<string, Keys>({
  max: 5000,
  ttl: 10 * 60 * 1000 // 10分
});

/** SSR対策: ブラウザ環境チェック */
const isBrowser = typeof window !== 'undefined';

/** 文字列正規化 */
const norm = (v: any): string => (v ?? '').toString().trim();

/** 8桁ゼロ埋め（数字のみの場合） */
const pad8 = (v?: string): string | undefined => {
  if (!v) return undefined;
  return /^\d+$/.test(v) ? v.padStart(8, '0') : v;
};

/** dw:empcodeからemployee_codeを読み取る（SSR安全） */
const readEmpCode = (): string | undefined => {
  if (!isBrowser) return undefined;
  const v = localStorage.getItem('dw:empcode') || sessionStorage.getItem('dw:empcode');
  return (v || '').trim() || undefined;
};

/** ユーザーの基本情報をDBから取得（id, username） */
async function readUserBasic(userId: string): Promise<{ id: string; username?: string }> {
  try {
    const rows = await withSshMysql(async (conn) => {
      const [result] = await conn.query(
        `SELECT CAST(id AS CHAR) as id, username FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      return result;
    });

    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0] as any;
      return { id: norm(r.id), username: norm(r.username) };
    }
  } catch (error) {
    console.error('[readUserBasic] DB error:', error);
  }

  return { id: norm(userId) };
}

/** DBから社員コードを取得（user_place_memberships想定） */
async function readEmpFromMembership(userId: string, placeCode: string): Promise<string | undefined> {
  // TODO: user_place_membershipsテーブルが実装されたら有効化
  // try {
  //   const rows = await withSshMysql(async (conn) => {
  //     const [result] = await conn.query(
  //       `SELECT employee_code FROM user_place_memberships WHERE user_id = ? AND place_code = ? LIMIT 1`,
  //       [userId, placeCode]
  //     );
  //     return result;
  //   });
  //   if (Array.isArray(rows) && rows.length > 0) {
  //     return norm((rows[0] as any).employee_code);
  //   }
  // } catch (error) {
  //   console.error('[readEmpFromMembership] DB error:', error);
  // }
  return undefined;
}

/** DW APIから社員コードを取得（暫定実装） */
async function fetchEmpCodeFromDW(placeCode: string): Promise<string | undefined> {
  try {
    // 暫定: localStorage から dw:empcode を取得
    const stored = readEmpCode();
    if (stored) {
      console.log(`[fetchEmpCodeFromDW] Using dw:empcode:`, stored);
      return norm(stored);
    }

    // TODO: DW API /co/places/{place_code}/users/me などから取得
    console.log(`[fetchEmpCodeFromDW] Not found for place=${placeCode}`);
    return undefined;
  } catch (error) {
    console.error('[fetchEmpCodeFromDW] Error:', error);
    return undefined;
  }
}

/** DBに社員コードをUPSERT（user_place_memberships想定） */
async function upsertMembership(userId: string, placeCode: string, employeeCode: string): Promise<void> {
  // TODO: user_place_membershipsテーブルが実装されたら有効化
  // try {
  //   await withSshMysql(async (conn) => {
  //     await conn.query(
  //       `INSERT INTO user_place_memberships (user_id, place_code, employee_code) VALUES (?, ?, ?)
  //        ON DUPLICATE KEY UPDATE employee_code = VALUES(employee_code)`,
  //       [userId, placeCode, employeeCode]
  //     );
  //   });
  // } catch (error) {
  //   console.error('[upsertMembership] DB error:', error);
  // }
}

/**
 * プレイス前提でユーザーキーを解決（社員コード含む）
 * ① DBで employee_code を検索
 * ② 無ければ DW から取得 → 取得できたら UPSERT
 */
export async function resolveMyKeys(userId: string, placeCode: string): Promise<Keys> {
  const cacheKey = `${userId}:${placeCode}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // ① ユーザー基本情報
  const { id, username } = await readUserBasic(userId);

  // ② DBから社員コード検索
  let emp = await readEmpFromMembership(userId, placeCode);

  // ③ 無ければDWから取得
  if (!emp) {
    emp = await fetchEmpCodeFromDW(placeCode);
    if (emp) {
      await upsertMembership(userId, placeCode, emp);
    }
  }

  const employeeCode = norm(emp);
  const padded = pad8(employeeCode);

  // id/username/employee_code/paddedの和集合
  const allSet = new Set([
    norm(id),
    norm(username),
    employeeCode,
    padded,
  ].filter(Boolean));

  const keys: Keys = {
    id: norm(id),
    username: norm(username),
    employee_code: employeeCode || undefined,
    all: Array.from(allSet),
  };

  cache.set(cacheKey, keys);
  return keys;
}

/** あるユーザーIDに対する自身のキー集合（画面側用） */
export async function getMyKeys(uid: string, placeCode: string): Promise<Keys> {
  return await resolveMyKeys(uid, placeCode);
}
