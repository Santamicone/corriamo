import type { StravaActivity, Profile } from './types'
import { formatPace } from './running/time'

/**
 * Assembler del feed unificato della crew (Step 4).
 *
 * Funzione PURA, lato server: fonde in un'unica timeline le attività Strava e i
 * nuovi membri, interpolando "insight" generati (statistiche di gruppo). Nessuna
 * query, nessun accesso al DB: riceve dati che la pagina crew già recupera —
 * quindi eredita gli stessi filtri di visibilità (RLS) delle query esistenti.
 */

export type FeedActivity = StravaActivity & {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export type FeedMember = {
  id: string
  user_id: string
  joined_at: string
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'city'>
}

export type FeedItem =
  | { kind: 'activity'; ts: number; activity: FeedActivity }
  | { kind: 'new_member'; ts: number; member: FeedMember }
  | { kind: 'insight'; text: string; icon: string }

const DAY = 86_400_000

function firstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName
}

/** Giorno dell'anno (1–366), per una rotazione giornaliera stabile degli insight. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return Math.floor((d.getTime() - start) / DAY)
}

type Insight = { text: string; icon: string }

/** Calcola gli insight candidati dalle attività (finestra 30gg / 7gg). */
function computeInsights(activities: FeedActivity[], now: Date): Insight[] {
  const t30 = now.getTime() - 30 * DAY
  const t7 = now.getTime() - 7 * DAY
  const recent = activities.filter((a) => new Date(a.start_date).getTime() >= t30)
  if (recent.length === 0) return []

  const out: Insight[] = []

  // Raggruppa per utente (preserva l'ordine desc in ingresso: più recenti prima)
  const byUser = new Map<string, FeedActivity[]>()
  for (const a of recent) {
    const arr = byUser.get(a.user_id)
    if (arr) arr.push(a)
    else byUser.set(a.user_id, [a])
  }

  // 1) Volume mese — utente con più km (soglia 10 km)
  let volBest: { name: string; km: number } | null = null
  for (const arr of byUser.values()) {
    const km = arr.reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000
    if (km >= 10 && (!volBest || km > volBest.km)) {
      volBest = { name: firstName(arr[0].user.full_name), km }
    }
  }
  if (volBest) {
    out.push({ text: `${volBest.name} ha corso ${Math.round(volBest.km)} km nell'ultimo mese`, icon: 'footprint' })
  }

  // 2) Passo medio — utente con ≥3 uscite con passo, media delle ultime 4
  let paceCand: { name: string; count: number; avg: number } | null = null
  for (const arr of byUser.values()) {
    const paced = arr.filter((a) => a.avg_pace_s_per_km != null)
    if (paced.length >= 3) {
      const last4 = paced.slice(0, 4)
      const avg = last4.reduce((s, a) => s + (a.avg_pace_s_per_km as number), 0) / last4.length
      // preferisci chi ha più uscite (più rappresentativo)
      if (!paceCand || paced.length > paceCand.count) {
        paceCand = { name: firstName(arr[0].user.full_name), count: paced.length, avg }
      }
    }
  }
  if (paceCand) {
    out.push({ text: `${paceCand.name}: media ${formatPace(paceCand.avg)}/km nelle ultime 4 uscite`, icon: 'speed' })
  }

  // 3) Uscita più lunga — max distanza singola nel mese
  let longest: { name: string; km: number } | null = null
  for (const a of recent) {
    const km = (a.distance_m ?? 0) / 1000
    if (km >= 5 && (!longest || km > longest.km)) {
      longest = { name: firstName(a.user.full_name), km }
    }
  }
  if (longest) {
    out.push({ text: `L'uscita più lunga: ${Math.round(longest.km)} km di ${longest.name}`, icon: 'trending_up' })
  }

  // 4) Totale crew nella settimana
  const weekKm = recent
    .filter((a) => new Date(a.start_date).getTime() >= t7)
    .reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000
  if (weekKm >= 20) {
    out.push({ text: `La crew ha macinato ${Math.round(weekKm)} km questa settimana`, icon: 'groups' })
  }

  return out
}

/** Seleziona fino a `n` insight, con rotazione giornaliera stabile (no random). */
function pickInsights(all: Insight[], now: Date, n: number): Insight[] {
  if (all.length <= n) return all
  const start = dayOfYear(now) % all.length
  const picked: Insight[] = []
  for (let i = 0; i < n; i++) picked.push(all[(start + i) % all.length])
  return picked
}

export function buildCrewFeed({
  activities,
  members,
  now = new Date(),
  maxInsights = 2,
  maxActivities,
}: {
  activities: FeedActivity[]
  members: FeedMember[]
  now?: Date
  maxInsights?: number
  /**
   * Tetto alle attività Strava mostrate in timeline (le più recenti). Gli insight
   * restano calcolati sull'intero set: si limita solo ciò che finisce nel feed.
   * Se assente, nessun limite.
   */
  maxActivities?: number
}): FeedItem[] {
  type TimedItem = Extract<FeedItem, { ts: number }>
  const events: TimedItem[] = []
  // `activities` arriva già ordinato per start_date desc dalla query: prendiamo
  // le prime N come "le più recenti" quando è impostato un tetto.
  const shownActivities = maxActivities != null ? activities.slice(0, maxActivities) : activities
  for (const a of shownActivities) {
    events.push({ kind: 'activity', ts: new Date(a.start_date).getTime(), activity: a })
  }
  for (const m of members) {
    if (!m.joined_at) continue
    events.push({ kind: 'new_member', ts: new Date(m.joined_at).getTime(), member: m })
  }
  events.sort((x, y) => y.ts - x.ts)

  const insights = pickInsights(computeInsights(activities, now), now, maxInsights)
    .map((i): FeedItem => ({ kind: 'insight', text: i.text, icon: i.icon }))

  // Interpola gli insight in posizioni stabili (dopo il 1° e il 4° evento);
  // se il feed è più corto, quelli avanzati finiscono in coda.
  const slots = [1, 4]
  const result: FeedItem[] = []
  let ins = 0
  events.forEach((ev, i) => {
    result.push(ev)
    if (ins < insights.length && slots[ins] === i + 1) {
      result.push(insights[ins])
      ins++
    }
  })
  while (ins < insights.length) result.push(insights[ins++])

  return result
}
