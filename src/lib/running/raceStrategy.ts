/**
 * Motore di calcolo della "Strategia gara intelligente".
 *
 * A partire dal passo ideale su piatto, dal profilo altimetrico del percorso
 * (segmenti chilometrici) e dalle condizioni di gara, stima il passo reale
 * chilometro per chilometro, il tempo finale e i tratti critici.
 *
 * Il modello è **trasparente e a coefficienti**: nessuna tabella proprietaria,
 * solo penalità/vantaggi documentati. I valori sono indicativi — la resa reale
 * dipende da preparazione, gestione e condizioni del giorno gara.
 */

// ── Coefficienti del modello (documentati) ──────────────────────────────────

/** Costo aggiuntivo per metro di dislivello positivo, in secondi/km. */
const UP_SEC_PER_M = 1.25
/** Vantaggio per metro di dislivello negativo, in secondi/km (parziale). */
const DOWN_SEC_PER_M = 0.7
/** Oltre questa pendenza in discesa (%) la discesa diventa tecnica e penalizza. */
const STEEP_DESCENT_PCT = -9
/** Penalità per punto % di pendenza oltre la soglia di discesa tecnica. */
const STEEP_DESCENT_SEC = 4

/** Moltiplicatori di passo per tipo di fondo. */
const TERRAIN_FACTOR: Record<Terrain, number> = {
  asfalto: 1.0,
  misto: 1.02,
  sterrato: 1.03,
  trail: 1.06,
  sampietrini: 1.05,
}

// ── Tipi ─────────────────────────────────────────────────────────────────────

export type Terrain = 'asfalto' | 'sterrato' | 'sampietrini' | 'trail' | 'misto'
export type WindType = 'nullo' | 'contro' | 'favore' | 'laterale'
export type Crowd = 'basso' | 'medio' | 'alto'
export type Approach = 'prudente' | 'regolare' | 'aggressivo'

export interface RaceConditions {
  temperatureC?: number
  humidityPct?: number
  windKmh?: number
  windType: WindType
  terrain: Terrain
  crowd: Crowd
  approach: Approach
}

export interface CourseSegment {
  km: number
  distanceM: number
  ascentM: number
  descentM: number
  gradePct: number
}

export interface StrategyInput {
  idealPaceSec: number
  segments: CourseSegment[]
  conditions: RaceConditions
}

export interface SplitRow {
  km: number
  distanceM: number
  paceSec: number
  deltaSec: number
  gradePct: number
  note: string
  critical: boolean
}

export interface StrategyResult {
  splits: SplitRow[]
  totalTimeSec: number
  marginSec: number
  avgPaceSec: number
  distanceM: number
  ascentM: number
  descentM: number
  criticalKms: number[]
  /** Percentuale di rallentamento ambientale complessivo (fondo+meteo). */
  environmentPct: number
}

// ── Fattori globali ──────────────────────────────────────────────────────────

/** Moltiplicatore ambientale sul passo base (fondo + meteo + approccio). */
function environmentMultiplier(c: RaceConditions): number {
  let mult = TERRAIN_FACTOR[c.terrain] ?? 1.0

  // Caldo: sopra i 15°C ~0.3% per °C; l'umidità alta amplifica se fa caldo.
  if (typeof c.temperatureC === 'number') {
    if (c.temperatureC > 15) {
      mult *= 1 + (c.temperatureC - 15) * 0.003
      if (typeof c.humidityPct === 'number' && c.humidityPct > 60 && c.temperatureC > 18) {
        mult *= 1 + ((c.humidityPct - 60) / 100) * 0.03
      }
    } else if (c.temperatureC < 5) {
      // Freddo pungente: leggero costo (muscoli meno reattivi).
      mult *= 1.005
    }
  }

  // Approccio: prudente parte cauto, aggressivo tira di più.
  if (c.approach === 'aggressivo') mult *= 0.99
  else if (c.approach === 'prudente') mult *= 1.005

  return mult
}

/** Secondi/km aggiunti (o tolti) dal vento. */
function windSecPerKm(c: RaceConditions): number {
  if (!c.windKmh || c.windKmh <= 0 || c.windType === 'nullo') return 0
  switch (c.windType) {
    case 'contro':
      return c.windKmh * 0.6
    case 'favore':
      return -Math.min(c.windKmh * 0.3, 12)
    case 'laterale':
      return c.windKmh * 0.15
    default:
      return 0
  }
}

/** Penalità affollamento (secondi/km) sui primi km, decrescente. */
function crowdSecForKm(c: RaceConditions, km: number, totalKm: number): number {
  const base = c.crowd === 'alto' ? 18 : c.crowd === 'medio' ? 8 : 0
  if (base === 0) return 0
  // Primi 3 km per affollamento alto, primi 2 per medio.
  const window = c.crowd === 'alto' ? 3 : 2
  if (km > window) {
    // Piccola coda ai ristori a metà gara nelle gare molto partecipate.
    if (c.crowd === 'alto' && totalKm >= 15 && km === Math.round(totalKm / 2)) return 5
    return 0
  }
  return base * (1 - (km - 1) / window)
}

/** Correzione dell'andatura per l'approccio scelto (negative-split, ecc.). */
function approachShaping(c: RaceConditions, km: number, totalKm: number, base: number): number {
  if (totalKm < 3) return 0
  const pos = (km - 0.5) / totalKm // 0..1
  // prudente: +1.5% nel primo terzo, -1.5% nell'ultimo terzo (progressione).
  // aggressivo: specchiato (parte forte).
  const shape = pos < 1 / 3 ? 1 : pos > 2 / 3 ? -1 : 0
  const amt = base * 0.015 * shape
  if (c.approach === 'prudente') return amt
  if (c.approach === 'aggressivo') return -amt
  return 0
}

// ── Calcolo principale ────────────────────────────────────────────────────────

export function computeRaceStrategy(input: StrategyInput): StrategyResult {
  const { idealPaceSec, segments, conditions } = input
  const totalKm = segments.length
  const envMult = environmentMultiplier(conditions)
  const basePace = idealPaceSec * envMult
  const wind = windSecPerKm(conditions)

  let totalTimeSec = 0
  let ascentM = 0
  let descentM = 0
  let distanceM = 0

  const splits: SplitRow[] = segments.map(seg => {
    ascentM += seg.ascentM
    descentM += seg.descentM
    distanceM += seg.distanceM

    // Costo altimetrico del km.
    let altimetry = seg.ascentM * UP_SEC_PER_M - seg.descentM * DOWN_SEC_PER_M
    if (seg.gradePct < STEEP_DESCENT_PCT) {
      altimetry += (STEEP_DESCENT_PCT - seg.gradePct) * STEEP_DESCENT_SEC
    }

    const crowd = crowdSecForKm(conditions, seg.km, totalKm)
    const shaping = approachShaping(conditions, seg.km, totalKm, basePace)

    const paceSec = Math.max(basePace * 0.75, basePace + altimetry + wind + crowd + shaping)
    const deltaSec = paceSec - idealPaceSec

    // Un km è "critico" se la sola altimetria pesa oltre il 6% del passo ideale.
    const critical = altimetry > idealPaceSec * 0.06 || (conditions.crowd === 'alto' && crowd >= 12)

    totalTimeSec += paceSec * (seg.distanceM / 1000)

    return {
      km: seg.km,
      distanceM: seg.distanceM,
      paceSec: Math.round(paceSec),
      deltaSec: Math.round(deltaSec),
      gradePct: seg.gradePct,
      note: buildNote(seg, altimetry, crowd, idealPaceSec),
      critical,
    }
  })

  const avgPaceSec = distanceM > 0 ? (totalTimeSec / (distanceM / 1000)) : idealPaceSec
  // Intervallo prudenziale: ~1.5% del tempo, minimo 60 s.
  const marginSec = Math.max(60, Math.round(totalTimeSec * 0.015))

  return {
    splits,
    totalTimeSec: Math.round(totalTimeSec),
    marginSec,
    avgPaceSec: Math.round(avgPaceSec),
    distanceM: Math.round(distanceM),
    ascentM: Math.round(ascentM),
    descentM: Math.round(descentM),
    criticalKms: splits.filter(s => s.critical).map(s => s.km),
    environmentPct: Math.round((envMult - 1) * 1000) / 10,
  }
}

/** Nota testuale sul tratto, in base al fattore dominante. */
function buildNote(seg: CourseSegment, altimetry: number, crowd: number, idealPace: number): string {
  if (altimetry > idealPace * 0.1) return 'Salita impegnativa: non forzare, tieni il fiato'
  if (altimetry > idealPace * 0.05) return 'In salita: accorcia il passo e resta regolare'
  if (seg.gradePct < STEEP_DESCENT_PCT) return 'Discesa tecnica: controlla, non frenare bruscamente'
  if (altimetry < -idealPace * 0.05) return 'Discesa favorevole: lascia scorrere senza strappi'
  if (crowd >= 12) return 'Partenza affollata: pazienza, recupererai dopo'
  return 'Tratto regolare: mantieni il ritmo'
}
