import type { Profile } from './types'

export type ReliabilityBadge = 'affidabile' | 'organizzatore' | null

/**
 * Restituisce il badge di affidabilità da mostrare per un organizzatore.
 *
 * Scala:
 * - 'affidabile'    → ≥ 3 corse eligible, score ≥ 85%
 * - 'organizzatore' → almeno 1 corsa confermata (ma non ancora "affidabile")
 * - null            → nessun badge
 */
export function getReliabilityBadge(profile: Pick<
  Profile,
  'reliability_score' | 'reliability_eligible' | 'reliability_confirmed'
>): ReliabilityBadge {
  const eligible  = profile.reliability_eligible  ?? 0
  const confirmed = profile.reliability_confirmed ?? 0
  const score     = profile.reliability_score     ?? null

  if (eligible >= 3 && score !== null && score >= 85) {
    return 'affidabile'
  }

  if (confirmed >= 1) {
    return 'organizzatore'
  }

  return null
}

export type AttendanceBadge = 'sempre_presente' | 'si_presenta' | null

/**
 * Badge di affidabilità come PARTECIPANTE (presenze confermate).
 *
 * - 'sempre_presente' → ≥ 3 corse eligible, score ≥ 80%
 * - 'si_presenta'     → almeno 1 presenza confermata
 * - null              → nessun badge
 */
export function getAttendanceBadge(profile: Pick<
  Profile,
  'attendance_score' | 'attendance_eligible' | 'attendance_confirmed'
>): AttendanceBadge {
  const eligible  = profile.attendance_eligible  ?? 0
  const confirmed = profile.attendance_confirmed ?? 0
  const score     = profile.attendance_score     ?? null

  if (eligible >= 3 && score !== null && score >= 80) {
    return 'sempre_presente'
  }

  if (confirmed >= 1) {
    return 'si_presenta'
  }

  return null
}
