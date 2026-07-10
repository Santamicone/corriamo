import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { exchangeCodeForToken } from '@/lib/strava/api'

/**
 * GET /api/strava/callback
 * Riceve il code da Strava, verifica lo state, scambia i token e salva la
 * connessione (service-role: la tabella strava_connections non ha policy).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const back = (q: string) => NextResponse.redirect(`${origin}/profilo/modifica?strava=${q}`)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  // Utente ha negato il consenso o errore Strava
  const error = searchParams.get('error')
  if (error) return back('denied')

  // Verifica state anti-CSRF
  const state = searchParams.get('state')
  const cookieState = request.cookies.get('strava_oauth_state')?.value
  if (!state || !cookieState || state !== cookieState) return back('error')

  const code = searchParams.get('code')
  if (!code) return back('error')

  // Lo scope deve includere activity:read
  const scope = searchParams.get('scope') ?? ''
  if (!scope.includes('activity:read')) return back('scope')

  try {
    const token = await exchangeCodeForToken(code)
    if (!token.athlete?.id) return back('error')

    const admin = createServiceRoleClient()
    const { error: upsertErr } = await admin
      .from('strava_connections')
      .upsert({
        user_id: user.id,
        strava_athlete_id: token.athlete.id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: new Date(token.expires_at * 1000).toISOString(),
        scope: token.scope ?? scope,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertErr) {
      console.error('[strava/callback] upsert', upsertErr)
      return back('error')
    }
  } catch (err) {
    console.error('[strava/callback]', err)
    return back('error')
  }

  const res = back('connected')
  res.cookies.delete('strava_oauth_state')
  return res
}
