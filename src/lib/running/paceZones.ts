/**
 * Calcolatore zone di passo (modello proprietario, derivato da formule pubbliche).
 *
 * Logica, documentata e difendibile:
 *  1. Dalla prestazione di gara stimo il "ritmo soglia" come ancora fisiologica:
 *     il ritmo che l'atleta potrebbe sostenere per ~60 minuti di gara.
 *     Lo derivo dalla formula di Riegel risolta per la distanza coperta in 1h.
 *  2. Ogni zona è un range percentuale sul ritmo soglia
 *     (percentuale > 100% = più lento, < 100% = più veloce).
 *  3. Esperienza e giorni/settimana modulano l'AMPIEZZA dei range e aggiungono
 *     un piccolo margine di prudenza per i meno allenati.
 *
 * Tutti i ritmi sono indicativi. Non è una tabella VDOT.
 */

import { DISTANCES, predictTime, RIEGEL_EXPONENT, type DistanceKey } from './riegel'

export type Experience = 'principiante' | 'intermedio' | 'avanzato'

export interface ZoneInput {
  raceMeters: number
  raceTimeSec: number
  experience: Experience
  daysPerWeek: number
}

export interface ZoneResult {
  key: string
  label: string
  hint: string
  /** Ritmi in secondi/km (lo = più veloce, hi = più lento). */
  loPace: number
  hiPace: number
}

export interface RacePace {
  key: DistanceKey
  label: string
  timeSec: number
  paceSecPerKm: number
}

export interface PaceZonesOutput {
  thresholdPaceSecPerKm: number
  zones: ZoneResult[]
  racePaces: RacePace[]
}

/**
 * Definizione zone: moltiplicatori sul ritmo soglia.
 * lo = estremo veloce, hi = estremo lento (entrambi > soglia per le zone lente).
 */
const ZONE_DEFS = [
  { key: 'facile',     label: 'Corsa facile',              hint: 'Conversazione comoda',          lo: 1.18, hi: 1.28 },
  { key: 'lungo',      label: 'Lungo lento',               hint: 'Resistenza aerobica',           lo: 1.15, hi: 1.25 },
  { key: 'medio',      label: 'Medio',                     hint: 'Ritmo controllato e brillante', lo: 1.05, hi: 1.10 },
  { key: 'soglia',     label: 'Soglia',                    hint: 'Corto-veloce / tempo run',      lo: 1.00, hi: 1.03 },
  { key: 'rip_lunghe', label: 'Ripetute lunghe (1000 m)',  hint: 'VO2max esteso',                 lo: 0.92, hi: 0.96 },
  { key: 'rip_brevi',  label: 'Ripetute brevi (400 m)',    hint: 'Potenza e meccanica',           lo: 0.86, hi: 0.92 },
] as const

/** Ampiezza relativa dei range per livello (1 = base). Più alto = forbice più larga. */
const WIDTH_BY_EXPERIENCE: Record<Experience, number> = {
  principiante: 1.30,
  intermedio:   1.00,
  avanzato:     0.85,
}

/** Margine di prudenza (rallenta tutto leggermente) per chi è meno allenato. */
function prudenceFactor(exp: Experience, daysPerWeek: number): number {
  let f = 1
  if (exp === 'principiante') f += 0.02
  if (daysPerWeek <= 2) f += 0.01
  return f
}

/**
 * Ritmo soglia (secondi/km): pace alla quale il tempo di gara previsto è 60'.
 * Da Riegel: T = T1·(D/D1)^e = 3600  ⇒  D = D1·(3600/T1)^(1/e).
 */
function thresholdPace(raceTimeSec: number, raceMeters: number): number {
  const dThr = raceMeters * Math.pow(3600 / raceTimeSec, 1 / RIEGEL_EXPONENT)
  return 3600 / (dThr / 1000)
}

export function computePaceZones(input: ZoneInput): PaceZonesOutput {
  const { raceMeters, raceTimeSec, experience, daysPerWeek } = input

  const thr = thresholdPace(raceTimeSec, raceMeters)
  const width = WIDTH_BY_EXPERIENCE[experience]
  const prudence = prudenceFactor(experience, daysPerWeek)

  const zones: ZoneResult[] = ZONE_DEFS.map(z => {
    const mid = (z.lo + z.hi) / 2
    const half = ((z.hi - z.lo) / 2) * width
    const lo = (mid - half) * prudence
    const hi = (mid + half) * prudence
    return {
      key: z.key,
      label: z.label,
      hint: z.hint,
      loPace: thr * lo,
      hiPace: thr * hi,
    }
  })

  const racePaces: RacePace[] = (Object.keys(DISTANCES) as DistanceKey[]).map(key => {
    const meters = DISTANCES[key]
    const timeSec = predictTime(raceTimeSec, raceMeters, meters)
    return {
      key,
      label: { k5: '5K', k10: '10K', half: 'Mezza', marathon: 'Maratona' }[key],
      timeSec,
      paceSecPerKm: timeSec / (meters / 1000),
    }
  })

  return { thresholdPaceSecPerKm: thr, zones, racePaces }
}
