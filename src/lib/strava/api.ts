import { createServiceRoleClient } from '@/lib/supabase/admin'

/**
 * Wrapper server-only sulle API Strava.
 * Non importare mai in codice client: usa client_secret e i token OAuth.
 */

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL     = 'https://www.strava.com/oauth/token'
const STRAVA_API_BASE      = 'https://www.strava.com/api/v3'

// Solo le corse finiscono nel feed
export const STRAVA_RUN_TYPES = ['Run', 'TrailRun']

function clientId()     { const v = process.env.STRAVA_CLIENT_ID;     if (!v) throw new Error('STRAVA_CLIENT_ID non configurata');     return v }
function clientSecret() { const v = process.env.STRAVA_CLIENT_SECRET; if (!v) throw new Error('STRAVA_CLIENT_SECRET non configurata'); return v }

/** URL di redirect verso il consenso Strava (scope: lettura attività). */
export function getAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read',
    state,
  })
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`
}

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number   // epoch seconds
  scope?: string
  athlete?: { id: number }
}

/** Scambia il code OAuth con i token (prima connessione). */
export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange fallito: ${res.status}`)
  return res.json()
}

/** Rinnova un access_token scaduto tramite refresh_token. */
export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh fallito: ${res.status}`)
  return res.json()
}

interface ConnectionRow {
  user_id: string
  strava_athlete_id: number
  access_token: string
  refresh_token: string
  expires_at: string
}

/**
 * Restituisce un access_token valido per la connessione: se è scaduto (o quasi)
 * lo rinnova e persiste i nuovi token con service-role. Margine di 60s.
 */
export async function getValidAccessToken(conn: ConnectionRow): Promise<string> {
  const expiresMs = new Date(conn.expires_at).getTime()
  if (expiresMs - Date.now() > 60_000) return conn.access_token

  const fresh = await refreshAccessToken(conn.refresh_token)
  const admin = createServiceRoleClient()
  await admin
    .from('strava_connections')
    .update({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: new Date(fresh.expires_at * 1000).toISOString(),
    })
    .eq('user_id', conn.user_id)
  return fresh.access_token
}

export interface StravaActivityDetail {
  id: number
  name: string
  type: string
  sport_type?: string
  distance: number                // metri
  moving_time: number             // secondi
  elapsed_time: number            // secondi
  total_elevation_gain: number    // metri
  start_date: string              // ISO UTC
  private: boolean
  has_heartrate?: boolean
  average_heartrate?: number      // bpm, presente solo se has_heartrate
}

// Giorni di storico importati al primo collegamento
export const BACKFILL_DAYS = 30

/**
 * Attività dell'atleta create dopo `afterEpoch` (secondi). L'endpoint lista
 * restituisce già i campi che ci servono (incluso `private`), quindi non serve
 * il dettaglio per-attività. Pagina fino a 3 volte (max 300) per sicurezza.
 */
export async function fetchRecentActivities(accessToken: string, afterEpoch: number): Promise<StravaActivityDetail[]> {
  const out: StravaActivityDetail[] = []
  const perPage = 100
  for (let page = 1; page <= 3; page++) {
    const url = `${STRAVA_API_BASE}/athlete/activities?after=${afterEpoch}&per_page=${perPage}&page=${page}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' })
    if (!res.ok) throw new Error(`Strava fetch activities fallito: ${res.status}`)
    const batch = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    out.push(...batch)
    if (batch.length < perPage) break
  }
  return out
}

/**
 * Backfill una tantum: importa le corse degli ultimi BACKFILL_DAYS giorni.
 * Ritorna il numero di corse importate. Scrive con service-role (upsert).
 */
export async function backfillRecentRuns(userId: string, accessToken: string): Promise<number> {
  const afterEpoch = Math.floor((Date.now() - BACKFILL_DAYS * 86_400_000) / 1000)
  const activities = await fetchRecentActivities(accessToken, afterEpoch)
  const rows = activities.filter(isImportableRun).map((a) => toActivityRow(userId, a))
  if (rows.length === 0) return 0
  const admin = createServiceRoleClient()
  const { error } = await admin.from('strava_activities').upsert(rows, { onConflict: 'strava_activity_id' })
  if (error) throw error
  return rows.length
}

/** Dettaglio di una singola attività. */
export async function fetchActivity(accessToken: string, activityId: number | string): Promise<StravaActivityDetail> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Strava fetch activity fallito: ${res.status}`)
  return res.json()
}

/** Revoca l'accesso dell'app all'account (usato in disconnessione). */
export async function deauthorize(accessToken: string): Promise<void> {
  await fetch('https://www.strava.com/oauth/deauthorize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => { /* best-effort: se fallisce cancelliamo comunque la connessione */ })
}

/** Un'attività è una corsa importabile? (tipo Run/TrailRun e non privata su Strava) */
export function isImportableRun(a: StravaActivityDetail): boolean {
  const type = a.sport_type || a.type
  return !a.private && STRAVA_RUN_TYPES.includes(type)
}

/** Mappa il dettaglio Strava sulla riga della tabella strava_activities. */
export function toActivityRow(userId: string, a: StravaActivityDetail) {
  const distanceKm = a.distance > 0 ? a.distance / 1000 : 0
  const avgPace = distanceKm > 0 && a.moving_time > 0 ? a.moving_time / distanceKm : null
  return {
    user_id: userId,
    strava_activity_id: a.id,
    name: a.name ?? null,
    distance_m: a.distance ?? null,
    moving_time_s: a.moving_time ?? null,
    elapsed_time_s: a.elapsed_time ?? null,
    total_elevation_gain_m: a.total_elevation_gain ?? null,
    activity_type: a.sport_type || a.type || null,
    start_date: a.start_date,
    avg_pace_s_per_km: avgPace,
    avg_heartrate_bpm: a.average_heartrate ?? null,
  }
}
