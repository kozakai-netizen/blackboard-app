import { fetchTrace } from '@/lib/utils/fetchTrace'

export type UserIdSource = 'query' | 'session' | 'autodetect' | 'default' | 'none'

export interface ResolveResult {
  userId: string | null
  source: UserIdSource
}

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '40824'
const DEFAULT_USER_NAME = '小坂井優'

/**
 * ユーザーIDの存在確認（/api/stg-users?id=...で検証）
 */
async function verifyUserId(userId: string): Promise<boolean> {
  try {
    const res = await fetchTrace(`/api/stg-users?id=${userId}&limit=1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5秒タイムアウト
    })
    if (!res.ok) {
      console.warn('[resolveUserId] API returned non-OK status:', res.status)
      return false
    }
    const data = await res.json()
    return data.users && data.users.length > 0
  } catch (err) {
    console.error('[resolveUserId] Failed to verify userId:', userId, err)
    return false
  }
}

/**
 * 名前でユーザーを自動検出
 */
async function autodetectByName(name: string): Promise<string | null> {
  try {
    const res = await fetchTrace(`/api/stg-users?name=${encodeURIComponent(name)}&limit=1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5秒タイムアウト
    })
    if (!res.ok) {
      console.warn('[resolveUserId] Autodetect API returned non-OK status:', res.status)
      return null
    }
    const data = await res.json()
    if (data.users && data.users.length > 0) {
      console.log(`[resolveUserId] Auto-detected userId: ${data.users[0].id} (${data.users[0].name})`)
      return String(data.users[0].id)
    }
    return null
  } catch (err) {
    console.error('[resolveUserId] Failed to autodetect by name:', name, err)
    return null
  }
}

/**
 * 有効なユーザーIDを解決
 *
 * 判定順序：
 * 1. ?user_id クエリパラメータ
 * 2. sessionStorage検証（存在確認）
 * 3. 名前で自動検出（デフォルト名）
 * 4. 既定ID（NEXT_PUBLIC_DEFAULT_USER_ID または 40824）
 *
 * ⚠️ 重要: このメソッドは**絶対にnullを返さない**。API失敗時もDEFAULT_USER_IDにフォールバックする。
 */
export async function resolveEffectiveUserId(): Promise<ResolveResult> {
  console.log('[resolveUserId] Starting user ID resolution...')

  try {
    // 1. ?user_id クエリパラメータ
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const queryUserId = urlParams.get('user_id')
      if (queryUserId) {
        console.log(`[resolveUserId] Found query param user_id: ${queryUserId}`)
        const isValid = await verifyUserId(queryUserId)
        if (isValid) {
          sessionStorage.setItem('userId', queryUserId)
          return { userId: queryUserId, source: 'query' }
        } else {
          console.warn(`[resolveUserId] Query param user_id ${queryUserId} is invalid, skipping`)
        }
      }
    }

    // 2. sessionStorage検証
    if (typeof window !== 'undefined') {
      const sessionUserId = sessionStorage.getItem('userId')
      if (sessionUserId) {
        console.log(`[resolveUserId] Found sessionStorage userId: ${sessionUserId}`)
        const isValid = await verifyUserId(sessionUserId)
        if (isValid) {
          return { userId: sessionUserId, source: 'session' }
        } else {
          console.warn(`[resolveUserId] sessionStorage userId ${sessionUserId} is invalid, removing`)
          sessionStorage.removeItem('userId')
        }
      }
    }

    // 3. 名前で自動検出
    console.log(`[resolveUserId] Auto-detecting by name: ${DEFAULT_USER_NAME}`)
    const autodetectedId = await autodetectByName(DEFAULT_USER_NAME)
    if (autodetectedId) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('userId', autodetectedId)
      }
      return { userId: autodetectedId, source: 'autodetect' }
    }
  } catch (error) {
    console.error('[resolveUserId] Critical error during resolution:', error)
  }

  // 4. 既定ID（必ずここに到達 - API失敗時も安全）
  console.log(`[resolveUserId] Using default userId: ${DEFAULT_USER_ID} (fallback)`)
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('userId', DEFAULT_USER_ID)
  }
  return { userId: DEFAULT_USER_ID, source: 'default' }
}
