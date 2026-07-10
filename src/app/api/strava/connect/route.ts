import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizeUrl } from '@/lib/strava/api'

/**
 * GET /api/strava/connect
 * Avvia il flusso OAuth Strava: genera uno state anti-CSRF (cookie httpOnly)
 * e reindirizza alla pagina di consenso Strava.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const state = crypto.randomUUID()
  const redirectUri = new URL('/api/strava/callback', request.nextUrl.origin).toString()

  const res = NextResponse.redirect(getAuthorizeUrl(redirectUri, state))
  res.cookies.set('strava_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minuti
  })
  return res
}
