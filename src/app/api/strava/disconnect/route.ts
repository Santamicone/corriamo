import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { deauthorize, getValidAccessToken } from '@/lib/strava/api'

/**
 * POST /api/strava/disconnect
 * Revoca l'accesso su Strava, cancella la connessione e le attività importate.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: conn } = await admin
    .from('strava_connections')
    .select('user_id, strava_athlete_id, access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (conn) {
    // Best-effort: revoca lato Strava (con token valido)
    try {
      const accessToken = await getValidAccessToken(conn)
      await deauthorize(accessToken)
    } catch (err) {
      console.error('[strava/disconnect] deauthorize', err)
    }

    // Cancella attività importate + connessione
    await admin.from('strava_activities').delete().eq('user_id', user.id)
    await admin.from('strava_connections').delete().eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
