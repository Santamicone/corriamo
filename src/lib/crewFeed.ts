import type { Profile } from './types'

/**
 * Assembler del feed della crew.
 *
 * Funzione PURA, lato server: costruisce la timeline dei nuovi ingressi. Nessuna
 * query, nessun accesso al DB: riceve dati che la pagina crew già recupera.
 *
 * (Le attività Strava e gli "insight" calcolati su di esse sono stati rimossi:
 * le regole dell'API Strava non permettono di mostrare i dati di un atleta ad
 * altri utenti. Vedi docs/STRAVA.md.)
 */

export type FeedMember = {
  id: string
  user_id: string
  joined_at: string
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'city'>
}

export type FeedItem = { kind: 'new_member'; ts: number; member: FeedMember }

/** Ultimi ingressi in crew (i più recenti prima), al massimo `max`. */
export function buildCrewFeed({ members, max = 5 }: { members: FeedMember[]; max?: number }): FeedItem[] {
  const events: FeedItem[] = []
  for (const m of members) {
    if (!m.joined_at) continue
    events.push({ kind: 'new_member', ts: new Date(m.joined_at).getTime(), member: m })
  }
  events.sort((x, y) => y.ts - x.ts)
  return events.slice(0, max)
}
