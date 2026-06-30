/**
 * Predizione tempi di gara con la formula di Riegel (modello pubblico).
 *
 *   T2 = T1 × (D2 / D1) ^ esponente
 *
 * Riferimento: Peter Riegel, "Athletic Records and Human Endurance" (1981).
 * Esponente classico 1.06; valori più bassi (~1.04) descrivono un atleta
 * con resistenza specifica superiore alla media (previsione "ottimistica").
 *
 * I risultati sono indicativi: la conversione reale dipende da preparazione
 * specifica, fondo, clima e altimetria del percorso.
 */

export const RIEGEL_EXPONENT = 1.06
export const RIEGEL_EXPONENT_OPTIMISTIC = 1.04

/** Distanze standard in metri. */
export const DISTANCES = {
  k5: 5000,
  k10: 10000,
  half: 21097.5,
  marathon: 42195,
} as const

export type DistanceKey = keyof typeof DISTANCES

export const DISTANCE_LABELS: Record<DistanceKey, string> = {
  k5: '5K',
  k10: '10K',
  half: 'Mezza maratona',
  marathon: 'Maratona',
}

/**
 * Predice il tempo (secondi) su distanza `toMeters` a partire da una
 * prestazione nota (`fromTimeSec` su `fromMeters`).
 */
export function predictTime(
  fromTimeSec: number,
  fromMeters: number,
  toMeters: number,
  exponent: number = RIEGEL_EXPONENT
): number {
  return fromTimeSec * Math.pow(toMeters / fromMeters, exponent)
}

/** Ritmo medio (secondi/km) di una prestazione. */
export function paceFromResult(timeSec: number, meters: number): number {
  return timeSec / (meters / 1000)
}
