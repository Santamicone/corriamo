import { createServiceRoleClient } from '@/lib/supabase/admin'
import { parseRunDateTime } from '@/lib/utils'

/**
 * Auto-conferma presenze: incrocia le attività Strava di un utente con le corse
 * a cui ha partecipato (approvato). Un match inserisce una conferma di presenza
 * (run_confirmations, source='strava'), che alimenta il reliability_score
 * dell'organizzatore e l'attendance_score del partecipante.
 *
 * Principi:
 *  - solo POSITIVO: non scrive mai confirmed=false (l'assenza di attività non
 *    prova l'assenza dell'utente); non sovrascrive conferme manuali.
 *  - idempotente: salta le corse già confermate.
 */

// Parametri di match (documentati, facili da tarare)
const START_BEFORE_MIN = 15      // l'attività può partire fino a 15' PRIMA del ritrovo
const START_AFTER_MIN  = 45      // ...e fino a 45' DOPO (riscaldamento, chiacchiere)
const DISTANCE_TOL     = 0.20    // ±20% sulla distanza dichiarata della corsa
const MAX_LOCATION_GAP_M = 2000  // se entrambe hanno coordinate e distano oltre 2km → no
const LOOKBACK_DAYS    = 35      // finestra di corse/attività da considerare

export interface RunForMatch {
  id: string
  date: string
  time: string
  distance_km: number | null
  lat: number | null
  lng: number | null
  status: string
}

export interface ActivityForMatch {
  start_date: string
  distance_m: number | null
  start_lat: number | null
  start_lng: number | null
}

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Un'attività combacia con una corsa? (tempo + distanza + guardia posizione) */
export function activityMatchesRun(act: ActivityForMatch, run: RunForMatch): boolean {
  const runStart = parseRunDateTime(run.date, run.time).getTime()
  const actStart = new Date(act.start_date).getTime()
  if (!Number.isFinite(actStart)) return false

  // 1. Finestra temporale
  const diffMin = (actStart - runStart) / 60_000
  if (diffMin < -START_BEFORE_MIN || diffMin > START_AFTER_MIN) return false

  // 2. Corroborazione distanza (solo se entrambe note)
  if (run.distance_km && act.distance_m) {
    const actKm = act.distance_m / 1000
    if (Math.abs(actKm - run.distance_km) > run.distance_km * DISTANCE_TOL) return false
  }

  // 3. Guardia posizione: scarta solo se ENTRAMBE note e chiaramente lontane
  if (run.lat != null && run.lng != null && act.start_lat != null && act.start_lng != null) {
    if (haversineM(run.lat, run.lng, act.start_lat, act.start_lng) > MAX_LOCATION_GAP_M) return false
  }

  return true
}

/**
 * Cerca match tra le attività recenti dell'utente e le corse passate a cui ha
 * partecipato, e inserisce le conferme mancanti + una notifica. Best-effort,
 * scrive con service-role. Ritorna il numero di presenze confermate.
 */
export async function autoConfirmAttendance(userId: string): Promise<number> {
  const admin = createServiceRoleClient()
  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()

  // Corse (approvate) a cui l'utente ha partecipato
  const { data: parts } = await admin
    .from('participations')
    .select('run:runs!inner(id, date, time, distance_km, lat, lng, status)')
    .eq('user_id', userId)
    .eq('status', 'approvata')

  const now = Date.now()
  const candidateRuns: RunForMatch[] = (parts ?? [])
    .map((p) => (p as unknown as { run: RunForMatch }).run)
    .filter((r) => {
      if (!r || r.status === 'annullata') return false
      const t = parseRunDateTime(r.date, r.time).getTime()
      return t < now && t >= now - LOOKBACK_DAYS * 86_400_000
    })

  if (candidateRuns.length === 0) return 0

  // Attività recenti dell'utente
  const { data: acts } = await admin
    .from('strava_activities')
    .select('start_date, distance_m, start_lat, start_lng')
    .eq('user_id', userId)
    .gte('start_date', sinceIso)

  const activities = (acts ?? []) as ActivityForMatch[]
  if (activities.length === 0) return 0

  // Conferme già esistenti (non sovrascrivere né duplicare)
  const runIds = candidateRuns.map((r) => r.id)
  const { data: existing } = await admin
    .from('run_confirmations')
    .select('run_id')
    .eq('user_id', userId)
    .in('run_id', runIds)
  const alreadyConfirmed = new Set((existing ?? []).map((e) => e.run_id as string))

  // Match: prima corsa senza conferma con almeno un'attività compatibile
  const toConfirm = candidateRuns.filter(
    (run) => !alreadyConfirmed.has(run.id) && activities.some((a) => activityMatchesRun(a, run)),
  )
  if (toConfirm.length === 0) return 0

  // Inserisci conferme (ON CONFLICT DO NOTHING: mai sovrascrivere una manuale)
  await admin.from('run_confirmations').upsert(
    toConfirm.map((r) => ({ run_id: r.id, user_id: userId, confirmed: true, source: 'strava' })),
    { onConflict: 'run_id,user_id', ignoreDuplicates: true },
  )

  // Notifica all'utente per ciascuna presenza confermata
  const { data: runTitles } = await admin
    .from('runs')
    .select('id, title')
    .in('id', toConfirm.map((r) => r.id))
  const titleById = new Map((runTitles ?? []).map((r) => [r.id as string, r.title as string]))

  await admin.from('notifications').insert(
    toConfirm.map((r) => ({
      user_id: userId,
      type: 'presenza_confermata',
      title: 'Presenza confermata',
      body: `Abbiamo confermato la tua presenza a "${titleById.get(r.id) ?? 'una corsa'}" dalla tua attività Strava.`,
      run_id: r.id,
      actor_id: null,
    })),
  )

  return toConfirm.length
}
