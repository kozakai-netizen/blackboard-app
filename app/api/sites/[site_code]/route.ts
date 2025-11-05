// app/api/sites/[site_code]/route.ts
import { getServerSupabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: { site_code: string } }
) {
  console.log('🔍 [GET /api/sites/[site_code]] site_code:', params.site_code)

  try {
    const supabase = getServerSupabase()

    // sites テーブルから現場情報を取得
    const { data: site, error } = await supabase
      .from('sites')
      .select('*')
      .eq('site_code', params.site_code)
      .single()

    if (error) {
      console.error('❌ [GET /api/sites/[site_code]] Supabase error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    }

    if (!site) {
      console.warn('⚠️ [GET /api/sites/[site_code]] Site not found')
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    }

    console.log('✅ [GET /api/sites/[site_code]] Site found:', site.site_name)
    return Response.json({ site })

  } catch (e: any) {
    console.error('❌ [GET /api/sites/[site_code]] Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: e?.message || 'Unknown error' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }
}
