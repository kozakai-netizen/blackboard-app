import { buildKeySet, includesUserLoose, UserKeys } from '@/lib/sites/matchMine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id') || searchParams.get('id') || process.env.NEXT_PUBLIC_DEFAULT_USER_ID || '40824'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || `http://localhost:${process.env.PORT || 3002}`

    // 1) ユーザーキー情報取得
    const userKeysRes = await fetch(`${baseUrl}/api/stg-user-keys?id=${encodeURIComponent(userId)}`, { cache: 'no-store' })
    const userKeysData = await userKeysRes.json()
    const userKeys: UserKeys | null = userKeysData?.user
      ? {
          id: userKeysData.user.id,
          employee_code: userKeysData.user.employee_code,
          login_id: userKeysData.user.login_id
        }
      : null

    const keySet = buildKeySet(userKeys)

    // 2) 現場一覧取得（進行中の全件）
    const sitesRes = await fetch(`${baseUrl}/api/sites/quicklist?q=&status=progress&per=100`, { cache: 'no-store' })
    const sitesData = await sitesRes.json()
    const sites = Array.isArray(sitesData?.items) ? sitesData.items : []

    // 3) マッチング診断
    const matched: any[] = []
    const mismatched: any[] = []

    sites.forEach((site: any) => {
      const isMatch = includesUserLoose(site, keySet)
      if (isMatch) {
        matched.push({
          site_code: site.site_code,
          site_name: site.site_name,
          status: site.status,
          manager_id: site.manager_id
        })
      } else {
        mismatched.push({
          site_code: site.site_code,
          site_name: site.site_name,
          status: site.status,
          manager_id: site.manager_id,
          reason: detectMismatchReason(site, keySet)
        })
      }
    })

    return Response.json({
      ok: true,
      user_id: userId,
      user_keys: userKeys,
      key_set: Array.from(keySet),
      total_sites: sites.length,
      matched_count: matched.length,
      mismatched_count: mismatched.length,
      matched_samples: matched.slice(0, 5),
      mismatched_samples: mismatched.slice(0, 5)
    })
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error?.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function detectMismatchReason(site: any, keys: Set<string>): string {
  if (!site) return 'site is null'
  if (keys.size === 0) return 'no user keys loaded'

  const cands: string[] = []

  // チェック対象のフィールド
  if (site.manager_id) cands.push(`manager_id:${site.manager_id}`)
  if (site.manager?.admin) cands.push(`manager.admin:${site.manager.admin}`)
  if (site.manager?.chief) cands.push(`manager.chief:${site.manager.chief}`)
  if (site.manager?.leader) cands.push(`manager.leader:${site.manager.leader}`)

  for (let i = 1; i <= 3; i++) {
    const subAdmin = site.manager?.[`sub_admin${i}`]
    if (subAdmin) cands.push(`manager.sub_admin${i}:${subAdmin}`)
  }

  if (Array.isArray(site.casts) && site.casts.length > 0) {
    cands.push(`casts[${site.casts.length}]`)
  }
  if (Array.isArray(site.workers) && site.workers.length > 0) {
    cands.push(`workers[${site.workers.length}]`)
  }
  if (Array.isArray(site.flat) && site.flat.length > 0) {
    cands.push(`flat[${site.flat.length}]`)
  }

  if (cands.length === 0) {
    return 'no candidates found in site data'
  }

  return `checked: ${cands.join(', ')} (no match with ${Array.from(keys).join(', ')})`
}
