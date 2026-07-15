import type { StravaActivity, Profile } from './types'

/**
 * Aggregatore delle statistiche allenamenti della crew (pagina "Tutti gli
 * allenamenti"). Funzione PURA, lato server: raggruppa le attività Strava per
 * atleta e calcola i totali, senza query né accesso al DB. Riceve i dati già
 * filtrati dalla RLS dalla pagina che la invoca (stessi vincoli di visibilità).
 */

export type StatsActivity = StravaActivity & {
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export type AthleteStats = {
  userId: string
  user: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  /** Attività dell'atleta, ordinate per data desc (le più recenti prima). */
  activities: StatsActivity[]
  count: number
  totalDistanceM: number
  totalMovingTimeS: number
  totalElevationM: number
  /** Passo medio ponderato sulla distanza (s/km). null se distanza/tempo assenti. */
  avgPaceSPerKm: number | null
  /** Uscita singola più lunga, in metri. */
  longestDistanceM: number
}

export type CrewStatsTotals = {
  athletes: number
  activities: number
  totalDistanceM: number
  totalMovingTimeS: number
  totalElevationM: number
}

export type CrewStats = {
  athletes: AthleteStats[]
  totals: CrewStatsTotals
}

/**
 * Raggruppa per atleta e calcola i totali. Gli atleti sono ordinati per km
 * totali (desc); le attività di ciascuno per data (desc).
 */
export function buildCrewStats(activities: StatsActivity[]): CrewStats {
  const byUser = new Map<string, StatsActivity[]>()
  for (const a of activities) {
    const arr = byUser.get(a.user_id)
    if (arr) arr.push(a)
    else byUser.set(a.user_id, [a])
  }

  const athletes: AthleteStats[] = []
  for (const [userId, acts] of byUser) {
    const sorted = [...acts].sort(
      (x, y) => new Date(y.start_date).getTime() - new Date(x.start_date).getTime()
    )
    let totalDistanceM = 0
    let totalMovingTimeS = 0
    let totalElevationM = 0
    let longestDistanceM = 0
    // Per il passo ponderato consideriamo solo le uscite con distanza E tempo.
    let pacedDistanceM = 0
    let pacedTimeS = 0
    for (const a of sorted) {
      const dist = a.distance_m ?? 0
      const time = a.moving_time_s ?? 0
      totalDistanceM += dist
      totalMovingTimeS += time
      totalElevationM += a.total_elevation_gain_m ?? 0
      if (dist > longestDistanceM) longestDistanceM = dist
      if (dist > 0 && time > 0) {
        pacedDistanceM += dist
        pacedTimeS += time
      }
    }
    athletes.push({
      userId,
      user: sorted[0].user,
      activities: sorted,
      count: sorted.length,
      totalDistanceM,
      totalMovingTimeS,
      totalElevationM,
      avgPaceSPerKm: pacedDistanceM > 0 ? pacedTimeS / (pacedDistanceM / 1000) : null,
      longestDistanceM,
    })
  }

  athletes.sort((a, b) => b.totalDistanceM - a.totalDistanceM)

  const totals: CrewStatsTotals = {
    athletes: athletes.length,
    activities: activities.length,
    totalDistanceM: athletes.reduce((s, a) => s + a.totalDistanceM, 0),
    totalMovingTimeS: athletes.reduce((s, a) => s + a.totalMovingTimeS, 0),
    totalElevationM: athletes.reduce((s, a) => s + a.totalElevationM, 0),
  }

  return { athletes, totals }
}
