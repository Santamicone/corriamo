import type { Run, Profile, RunLevel } from './types'

/* ── Tipi ── */
export interface CompatibilityResult {
  score: number       // 0-100
  label: string       // 'Perfetta per te' | 'Molto compatibile' | 'Compatibile'
}

export type RunHistory = Array<{
  level: RunLevel
  time: string            // "HH:MM:SS"
  distance_km: number | null
  is_no_drop: boolean
  pace_target: string | null
}>

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

/** Converte una stringa ritmo in range decimale min/km.
 *  Gestisce: "5:30/km", "5:00–5:30/km", "5.5", "5:30-5:45/km"
 */
export function parsePace(raw: string | null): { min: number; max: number } | null {
  if (!raw) return null
  const s = raw.replace(/\/km.*/i, '').trim()

  // Range "5:00–5:30" o "5:00-5:30"
  const range = s.match(/(\d+):(\d+)\s*[-–]\s*(\d+):(\d+)/)
  if (range) {
    return {
      min: +range[1] + +range[2] / 60,
      max: +range[3] + +range[4] / 60,
    }
  }

  // Singolo "5:30"
  const single = s.match(/^(\d+):(\d+)$/)
  if (single) {
    const v = +single[1] + +single[2] / 60
    return { min: v, max: v }
  }

  // Decimale "5.5"
  const dec = parseFloat(s)
  if (!isNaN(dec) && dec >= 2 && dec <= 15) return { min: dec, max: dec }

  return null
}

/** Grado di sovrapposizione tra due range (0–1) */
export function overlap(
  aMin: number, aMax: number,
  bMin: number, bMax: number
): number {
  const lo = Math.max(aMin, bMin)
  const hi = Math.min(aMax, bMax)
  if (hi < lo) return 0
  const union = Math.max(aMax, bMax) - Math.min(aMin, bMin) || 0.01
  return (hi - lo) / union
}

export const LEVEL_IDX: Record<RunLevel, number> = {
  principiante: 0, intermedio: 1, avanzato: 2, tutti: -1,
}

/** Mappa i livelli profilo estesi al livello di corsa equivalente per il calcolo di compatibilità */
export function toRunLevel(pl: string | null): RunLevel | null {
  if (!pl) return null
  const map: Record<string, RunLevel> = {
    principiante: 'principiante',
    intermedio:   'intermedio',
    avanzato:     'avanzato',
    tutti:        'tutti',
    amatore_gare: 'avanzato',
    atleta:       'avanzato',
  }
  return map[pl] ?? null
}

/* ─────────────────────────────────────────
   COMPONENTI DEL PUNTEGGIO
───────────────────────────────────────── */

function scoreLevel(userLevel: string | null, runLevel: RunLevel): number {
  const mapped = toRunLevel(userLevel)
  if (!mapped || mapped === 'tutti') return 20  // neutro
  if (runLevel === 'tutti') return 25
  if (runLevel === mapped) return 30
  const diff = Math.abs(LEVEL_IDX[mapped] - LEVEL_IDX[runLevel])
  return diff === 1 ? 15 : 0   // adiacente → 15, opposto → 0
}

function scorePace(user: Profile, run: Run): number {
  if (!user.pace_min) return 13   // neutro

  const userRange = { min: user.pace_min, max: user.pace_max ?? user.pace_min }
  const runRange  = parsePace(run.pace_target)

  if (!runRange) return 13        // corsa senza ritmo target → neutro

  const ov = overlap(userRange.min, userRange.max, runRange.min, runRange.max)
  if (ov > 0) return Math.round(ov * 25)

  // Nessun overlap: verifica la distanza
  const gap = Math.max(
    0,
    Math.max(userRange.min, runRange.min) - Math.min(userRange.max, runRange.max)
  )
  return gap < 0.5 ? 8 : 0       // < 30 sec/km → ancora qualcosa
}

function scoreCity(userCity: string | null, runCity: string): number {
  if (!userCity) return 0
  const u = userCity.toLowerCase().trim()
  const r = runCity.toLowerCase().trim()
  if (u === r) return 20
  if (u.includes(r) || r.includes(u)) return 12
  return 0
}

function scoreNoDrop(run: Run, history: RunHistory): number {
  if (history.length < 2) return 5   // neutro

  const ratio = history.filter(h => h.is_no_drop).length / history.length
  const prefersNoDrop = ratio >= 0.5

  if (run.is_no_drop && prefersNoDrop)  return 10
  if (run.is_no_drop && !prefersNoDrop) return 6
  if (!run.is_no_drop && !prefersNoDrop) return 5
  return 2   // non no-drop, ma l'utente la preferisce
}

function scoreTimeOfDay(run: Run, history: RunHistory): number {
  if (history.length < 3) return 4   // neutro

  const hour = (t: string) => parseInt(t.split(':')[0])
  const slot = (h: number) => h < 10 ? 0 : h < 17 ? 1 : 2   // 0=mattina, 1=pomeriggio, 2=sera

  const counts = [0, 0, 0]
  history.forEach(h => counts[slot(hour(h.time))]++)

  const maxCount = Math.max(...counts)
  if (maxCount / history.length < 0.5) return 4   // nessuna preferenza chiara

  const prefSlot = counts.indexOf(maxCount)
  const runSlot  = slot(hour(run.time))

  if (runSlot === prefSlot) return 8
  if (Math.abs(runSlot - prefSlot) === 1) return 3   // fascia adiacente
  return 0
}

function scoreDistance(run: Run, history: RunHistory): number {
  if (!run.distance_km) return 3   // neutro

  const dists = history.map(h => h.distance_km).filter((d): d is number => d !== null)
  if (dists.length < 2) return 3

  const avg = dists.reduce((a, b) => a + b, 0) / dists.length
  const lo  = avg * 0.65
  const hi  = avg * 1.45

  if (run.distance_km >= lo && run.distance_km <= hi) return 7
  if (run.distance_km >= lo * 0.6 && run.distance_km <= hi * 1.5) return 3
  return 0
}

/* ─────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────── */

/**
 * Calcola il punteggio di compatibilità tra un utente e una corsa.
 * Restituisce null se il profilo è troppo scarno per dare un risultato utile.
 */
export function computeCompatibility(
  run: Run,
  user: Profile,
  history: RunHistory
): CompatibilityResult | null {
  // Serve almeno un segnale di profilo
  const hasProfile  = !!(user.level || user.pace_min || user.city)
  const hasHistory  = history.length >= 2
  if (!hasProfile && !hasHistory) return null

  const raw =
    scoreLevel(user.level, run.level)      +  // max 30
    scorePace(user, run)                   +  // max 25
    scoreCity(user.city, run.city)         +  // max 20
    scoreNoDrop(run, history)              +  // max 10
    scoreTimeOfDay(run, history)           +  // max  8
    scoreDistance(run, history)               // max  7

  const score = Math.min(100, Math.max(0, Math.round(raw)))

  // Soglie etichette
  if (score >= 88) return { score, label: 'Perfetta per te' }
  if (score >= 72) return { score, label: 'Molto compatibile' }
  if (score >= 55) return { score, label: 'Compatibile' }

  return null   // sotto la soglia: non mostrare il badge
}
