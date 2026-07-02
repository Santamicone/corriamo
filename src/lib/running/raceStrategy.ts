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

/** Moltiplicatori di passo per la tortuosità del percorso (curve). */
const CURVES_FACTOR: Record<Curves, number> = {
  scorrevole: 1.0, // rettilinei, poche curve
  misto: 1.006, // qualche curva, rotatorie, cambi di direzione
  tecnico: 1.018, // curve strette a gomito, tornanti che spezzano il ritmo
}

/** Secondi/km aggiunti (+) o tolti (−) dal vento, per intensità e direzione. */
const WIND_SEC_PER_KM: Record<Wind, number> = {
  assente: 0,
  'debole-favore': -4,
  'forte-favore': -9,
  'debole-contro': 8,
  'forte-contro': 18,
}

// ── Tipi ─────────────────────────────────────────────────────────────────────

export type Terrain = 'asfalto' | 'sterrato' | 'sampietrini' | 'trail' | 'misto'
export type Wind = 'assente' | 'debole-favore' | 'forte-favore' | 'debole-contro' | 'forte-contro'
export type Curves = 'scorrevole' | 'misto' | 'tecnico'
export type Crowd = 'basso' | 'medio' | 'alto'
export type Approach = 'prudente' | 'regolare' | 'aggressivo'

export interface RaceConditions {
  temperatureC?: number
  humidityPct?: number
  wind: Wind
  curves: Curves
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
  mult *= CURVES_FACTOR[c.curves] ?? 1.0

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
  return WIND_SEC_PER_KM[c.wind] ?? 0
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

// ── Commento narrativo (basato sulle caratteristiche del percorso) ────────────

/**
 * Genera un commento strategico della gara a partire dai dati calcolati.
 * Nessun modello esterno: sole regole trasparenti su altimetria, condizioni e
 * distribuzione dei tratti critici. Ritorna 3 paragrafi (partenza, centrale,
 * finale).
 */
export function buildRaceComment(
  result: StrategyResult,
  conditions: RaceConditions,
  idealPaceSec: number,
): string[] {
  const s = result.splits
  const n = s.length
  if (n === 0) return []

  const third = n / 3
  const firstThird = s.filter(x => x.km <= Math.ceil(third))
  const lastThird = s.filter(x => x.km > Math.floor(2 * third))
  const avgGrade = (arr: SplitRow[]) =>
    arr.length ? arr.reduce((a, b) => a + b.gradePct, 0) / arr.length : 0
  const gStart = avgGrade(firstThird)
  const gEnd = avgGrade(lastThird)
  const hardest = s.reduce((a, b) => (b.deltaSec > a.deltaSec ? b : a), s[0])
  const netDownhill = result.descentM - result.ascentM

  // ── Paragrafo 1: lettura del percorso e partenza ──
  const p1: string[] = []
  if (conditions.crowd === 'alto') {
    p1.push('Partenza molto affollata: nei primi km lascia sfogare la ressa, non sprecare energie a zigzagare per guadagnare due posizioni.')
  }
  if (gStart > 1.5) {
    p1.push('Si parte in salita, quindi parti morbido: il tempo perso qui lo recuperi più avanti, bruciarti subito no.')
  } else if (gStart < -1.5) {
    p1.push('I primi chilometri sono in discesa ed è la trappola classica: tieni il freno tirato, partire troppo forte qui si paga carissimo dopo.')
  } else {
    p1.push('I primi chilometri sono abbastanza regolari: imposta subito il tuo passo ideale, senza inseguire chi scatta.')
  }
  if (conditions.approach === 'prudente') {
    p1.push('Con un approccio prudente punta a chiudere più forte di come sei partito.')
  } else if (conditions.approach === 'aggressivo') {
    p1.push('Hai scelto un approccio aggressivo: può pagare, ma solo se le sensazioni restano buone nel tratto centrale.')
  }

  // ── Paragrafo 2: gestione centrale e tratti critici ──
  const p2: string[] = []
  if (result.criticalKms.length > 0) {
    const list = result.criticalKms.join(', ')
    p2.push(`Il cuore della gara sono i tratti critici (km ${list}): è lì che il percorso morde di più. Il punto più impegnativo è il km ${hardest.km}, dove conviene accorciare il passo e tenere il fiato sotto controllo.`)
  } else {
    p2.push('Il percorso non ha strappi cattivi: la sfida è la regolarità, non lasciare che il passo si sfaldi nel tratto centrale.')
  }
  if (typeof conditions.temperatureC === 'number' && conditions.temperatureC > 20) {
    p2.push(`Con circa ${conditions.temperatureC}°C il caldo pesa: bevi a ogni ristoro e non inseguire il passo ideale al secondo.`)
  } else if (typeof conditions.temperatureC === 'number' && conditions.temperatureC < 5) {
    p2.push('Fa freddo: copriti alla partenza e concediti qualche minuto in più per entrare in temperatura.')
  }
  if (conditions.wind === 'debole-contro' || conditions.wind === 'forte-contro') {
    p2.push('Il vento contrario ti frena: mettiti in scia ad altri runner quando puoi e non spendere troppo per contrastarlo.')
  } else if (conditions.wind === 'forte-favore') {
    p2.push('Hai il vento a favore: approfittane per far scorrere il passo senza aumentare lo sforzo.')
  }
  if (conditions.curves === 'tecnico') {
    p2.push('Il percorso è tortuoso, con curve strette: rallenta in ingresso e riparti pulito in uscita, evita frenate brusche che spezzano il ritmo.')
  }
  if (conditions.terrain === 'trail' || conditions.terrain === 'sterrato' || conditions.terrain === 'sampietrini') {
    p2.push(`Sul fondo ${conditions.terrain} il passo è naturalmente più lento: valuta lo sforzo, non solo il cronometro.`)
  }

  // ── Paragrafo 3: come chiudere ──
  const p3: string[] = []
  if (gEnd > 1.5) {
    p3.push('Attenzione al finale in salita: conserva qualcosa per gli ultimi chilometri, sono i più duri e faranno la differenza sul tempo.')
  } else if (gEnd < -1.5) {
    p3.push('Il finale è in discesa: se arrivi lucido puoi chiudere in progressione, ma occhio a quadricipiti e articolazioni, non buttarti a rotta di collo.')
  } else {
    p3.push('Finale regolare: se hai gestito bene le energie, gli ultimi chilometri sono il momento giusto per spingere.')
  }
  if (netDownhill > 50) {
    p3.push('Nel complesso il percorso scende più di quanto salga: un piccolo aiuto sul tempo finale, se sai sfruttare le discese senza strappi.')
  } else if (netDownhill < -50) {
    p3.push('Il bilancio altimetrico è in salita: aspettati un tempo un po’ più alto del tuo passo su piatto, ed è del tutto normale.')
  }

  return [p1.join(' '), p2.join(' '), p3.join(' ')]
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
