/**
 * プレイスごとのユーザーロール判定
 *
 * @param userId - ユーザーID
 * @param placeId - プレイスID
 * @returns "prime" (元請け) | "sub" (協力業者) | "unknown" (DB接続エラー)
 * @throws DB接続エラー時は "unknown" を返す（エラーを握りつぶさない）
 *
 * 判定ロジック（全プレイス共通）:
 * 1. 協力業者 company_id を1つでも持つ → 協力業者 (sub)
 * 2. 純粋に元請け company_id だけを持つ → 元請け (prime)
 * 3. どの company_id も持たない → 協力業者 (sub)
 * 4. DB接続エラー → unknown（明示的なエラー状態）
 *
 * ※ DWの業者管理ロール・代理管理などにより、協力業者が元請け company_id にも
 *    紐づくケースがあるため、「協力業者 company_id を1つでも持てば sub」とする。
 *
 * 詳細仕様: docs/dw-integration-spec.md を参照
 */

import { withSshMysql } from '@/lib/db/sshMysql';

// プレイスごとの元請け会社ID定義
const PRIME_COMPANY_IDS_BY_PLACE: Record<number, number[]> = {
  170: [98315, 203104], // place_id=170（dandoli-sample1）の元請け会社
  // 他のプレイスを追加する場合はここに記述
};

export type UserRole = 'prime' | 'sub' | 'unknown';

interface CrewRecord {
  id: number;
  user_id: number;
  place_id: number;
  user_level: number;
  company_id: number | null;
  deleted: number;
}

/**
 * プレイスにおけるユーザーのロールを取得
 */
export async function getRoleForPlace(
  userId: number,
  placeId: number
): Promise<UserRole> {
  try {
    const crewsForUser = await withSshMysql(async (conn) => {
      const [rows] = await conn.query<any[]>(
        `SELECT id, user_id, place_id, user_level, company_id, deleted
         FROM crews
         WHERE user_id = ?
           AND place_id = ?
           AND deleted = 0`,
        [userId, placeId]
      );
      return rows as CrewRecord[];
    });

    if (crewsForUser.length === 0) {
      // プレイスに所属していない → 協力業者扱い
      console.log(`[getRoleForPlace] user_id=${userId} は place_id=${placeId} に所属していません → sub`);
      return 'sub';
    }

    // 元請け会社IDリスト取得
    const primeCompanyIds = PRIME_COMPANY_IDS_BY_PLACE[placeId] || [];

    // 元請け company_id を持つレコードと協力業者 company_id を持つレコードを分類
    const hasPrimeCompany = crewsForUser.some(c =>
      c.company_id !== null && primeCompanyIds.includes(c.company_id)
    );
    const hasSubCompany = crewsForUser.some(c =>
      c.company_id !== null && !primeCompanyIds.includes(c.company_id)
    );

    // 判定ルール: 協力業者 company_id を1つでも持っていれば協力業者扱い
    if (hasSubCompany) {
      const subCompanyIds = crewsForUser
        .filter(c => c.company_id !== null && !primeCompanyIds.includes(c.company_id))
        .map(c => c.company_id);
      console.log(
        `[getRoleForPlace] user_id=${userId} は協力業者 company_id (${subCompanyIds.join(',')}) を持つ → sub`
      );
      return 'sub';
    }

    // 純粋に元請け company_id だけを持つ場合 → 元請け
    if (hasPrimeCompany) {
      const primeCompanyIdsList = crewsForUser
        .filter(c => c.company_id !== null && primeCompanyIds.includes(c.company_id))
        .map(c => c.company_id);
      console.log(
        `[getRoleForPlace] user_id=${userId} は元請け company_id (${primeCompanyIdsList.join(',')}) のみ所属 → prime`
      );
      return 'prime';
    }

    // company_id が null の場合や、元請けリストが空の場合 → 協力業者
    console.log(`[getRoleForPlace] user_id=${userId} は place_id=${placeId} で協力業者 → sub`);
    return 'sub';

  } catch (error: any) {
    console.error('[getRoleForPlace] ❌ DB接続エラー:', error.message);
    console.error('[getRoleForPlace] ❌ スタックトレース:', error.stack);
    // エラー時は "unknown" を返して明示的にエラー状態を示す
    return 'unknown';
  }
}

/**
 * 同期版（crewsレコードを渡す場合）
 * API内で既にcrewsを取得済みの場合に使用
 */
export function getRoleForPlaceSync(
  userId: number,
  placeId: number,
  crewsForUser: CrewRecord[]
): UserRole {
  if (crewsForUser.length === 0) {
    return 'sub';
  }

  const primeCompanyIds = PRIME_COMPANY_IDS_BY_PLACE[placeId] || [];

  // 元請け company_id を持つレコードと協力業者 company_id を持つレコードを分類
  const hasPrimeCompany = crewsForUser.some(c =>
    c.company_id !== null && primeCompanyIds.includes(c.company_id)
  );
  const hasSubCompany = crewsForUser.some(c =>
    c.company_id !== null && !primeCompanyIds.includes(c.company_id)
  );

  // 判定ルール: 協力業者 company_id を1つでも持っていれば協力業者扱い
  if (hasSubCompany) {
    return 'sub';
  }

  // 純粋に元請け company_id だけを持つ場合 → 元請け
  if (hasPrimeCompany) {
    return 'prime';
  }

  // company_id が null の場合や、元請けリストが空の場合 → 協力業者
  return 'sub';
}
