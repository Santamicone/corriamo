/**
 * Distacco definitivo dell'integrazione Strava (vedi docs/STRAVA.md, "ARCHIVIATA").
 *
 * Da lanciare UNA VOLTA, in locale, PRIMA di applicare supabase/strava-detach.sql
 * (dopo il SQL i token non esisterebbero più e non si potrebbero revocare).
 *
 *   node --env-file=.env.local scripts/strava-detach.mjs            # dry-run: elenca soltanto
 *   node --env-file=.env.local scripts/strava-detach.mjs --apply    # revoca token + elimina webhook
 *
 * Cosa fa (con --apply):
 *   1. per ogni riga di strava_connections: rinnova il token se scaduto e revoca
 *      l'accesso su Strava (POST /oauth/deauthorize); NON cancella righe dal DB
 *      (lo fa il file SQL);
 *   2. elimina la subscription webhook dell'app (se esiste).
 *
 * Richiede in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET. Non stampa mai token né segreti.
 */
import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET })) {
  if (!v) { console.error(`Manca ${k} in .env.local`); process.exit(1) }
}

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(apply ? '== MODO APPLY ==' : '== DRY-RUN (nessuna modifica; usa --apply per eseguire) ==')

const { data: conns, error } = await admin
  .from('strava_connections')
  .select('user_id, strava_athlete_id, access_token, refresh_token, expires_at')
if (error) { console.error('Lettura strava_connections fallita:', error.message); process.exit(1) }

const { count: actCount } = await admin.from('strava_activities').select('id', { count: 'exact', head: true })
const { count: confCount } = await admin.from('run_confirmations').select('id', { count: 'exact', head: true }).eq('source', 'strava')
console.log(`Connessioni Strava: ${conns.length} · attività importate: ${actCount ?? '?'} · presenze auto-confermate (source='strava'): ${confCount ?? 'colonna assente'}`)

async function freshAccessToken(c) {
  if (new Date(c.expires_at).getTime() - Date.now() > 60_000) return c.access_token
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: c.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`refresh fallito (${res.status})`)
  return (await res.json()).access_token
}

let revoked = 0
let failed = 0
for (const c of conns) {
  const label = `athlete ${c.strava_athlete_id} (user ${c.user_id.slice(0, 8)}…)`
  if (!apply) { console.log(`  [dry-run] revocherei ${label}`); continue }
  try {
    const token = await freshAccessToken(c)
    const res = await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`deauthorize ${res.status}`)
    console.log(`  revocato ${label}`)
    revoked++
  } catch (e) {
    console.error(`  ERRORE ${label}: ${e.message} (probabilmente già revocato dall'utente)`)
    failed++
  }
}
if (apply) console.log(`Revoche: ${revoked} ok, ${failed} con errore`)

// Webhook subscription (una sola per app)
const subsUrl = `https://www.strava.com/api/v3/push_subscriptions?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`
const subsRes = await fetch(subsUrl)
const subs = subsRes.ok ? await subsRes.json() : []
console.log(`Subscription webhook attive: ${Array.isArray(subs) ? subs.length : '?'}`)
for (const s of Array.isArray(subs) ? subs : []) {
  if (!apply) { console.log(`  [dry-run] eliminerei subscription ${s.id}`); continue }
  const del = await fetch(
    `https://www.strava.com/api/v3/push_subscriptions/${s.id}?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`,
    { method: 'DELETE' },
  )
  console.log(`  subscription ${s.id}: ${del.status === 204 ? 'eliminata' : `HTTP ${del.status}`}`)
}

console.log(apply
  ? 'Fatto. Ora applica supabase/strava-detach.sql e poi elimina l\'app su strava.com/settings/api.'
  : 'Dry-run completato.')
