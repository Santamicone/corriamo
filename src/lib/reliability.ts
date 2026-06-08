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
