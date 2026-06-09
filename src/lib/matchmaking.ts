import type { Profile } from './types'
import { parsePace, overlap, toRunLevel, LEVEL_IDX } from './compatibility'
import { formatPace } from './utils'

/* ── Tipi ── */
export interface RunnerMatch {
  profile: Profile
  score: number       // 0-100
  label: string       // 'Ottima sintonia' | 'Molto compatibile' | 'Compatibile'
  reasons: string[]   // motivi leggibili del match (max 3)
}

/* Etichette leggibili delle motivazioni `why_i_run` (allineate al profilo pubblico) */
const WHY_LABELS: Record<string, string> = {
  forma:        'stare in forma',
  divertimento: 'divertirsi',
  prestazioni:  'migliorare le prestazioni',
  amicizia:     'fare amicizia',
  benessere:    'benessere mentale',
  gare:         'le gare',
  sfida:        'mettersi alla prova',
}

/* ─────────────────────────────────────────
   COMPONENTI DEL PUNTEGGIO (profilo ↔ profilo)
   Pesi: città 35 · ritmo 30 · livello 20 · motivazioni 15 = 100
───────────────────────────────────────── */

function scoreCity(me: string | null, other: string | null): number {
  if (!me || !other) return 0
  const a = me.toLowerCase().trim()
  const b = other.toLowerCase().trim()
  if (a === b) return 35
  if (a.includes(b) || b.includes(a)) return 20
  return 0
}

function scorePace(me: Profile, other: Profile): number {
  if (!me.pace_min || !other.pace_min) return 0
  const ov = overlap(
    me.pace_min, me.pace_max ?? me.pace_min,
    other.pace_min, other.pace_max ?? other.pace_min,
  )
  if (ov > 0) return Math.round(ov * 30)

  // Nessuna sovrapposizione: premia comunque i ritmi vicini (< 30"/km di gap)
  const gap = Math.max(me.pace_min, other.pace_min) - Math.min(me.pace_max ?? me.pace_min, other.pace_max ?? other.pace_min)
  return gap > 0 && gap < 0.5 ? 10 : 0
}

function scoreLevel(me: string | null, other: string | null): number {
  const a = toRunLevel(me)
  const b = toRunLevel(other)
  if (!a || !b) return 0
  if (a === 'tutti' || b === 'tutti') return 12   // wildcard → neutro positivo
  if (a === b) return 20
  return Math.abs(LEVEL_IDX[a] - LEVEL_IDX[b]) === 1 ? 10 : 0
}

function whyOverlap(me: string[], other: string[]): string[] {
  const set = new Set(other)
  return me.filter(w => set.has(w))
}

function scoreWhy(me: string[] | null, other: string[] | null): number {
  if (!me?.length || !other?.length) return 0
  const inter = whyOverlap(me, other).length
  const union = new Set([...me, ...other]).size
  return union === 0 ? 0 : Math.round((inter / union) * 15)
}

/* ─────────────────────────────────────────
   ENTRY POINT
───────────────────────────────────────── */

/**
 * Calcola quanto due runner sono compatibili come compagni di corsa.
 * Restituisce `null` se non c'è abbastanza segnale o il match è troppo debole.
 */
export function computeRunnerMatch(me: Profile, other: Profile): RunnerMatch | null {
  if (me.id === other.id) return null

  const cityPts  = scoreCity(me.city, other.city)
  const pacePts  = scorePace(me, other)
  const levelPts = scoreLevel(me.level, other.level)
  const whyPts   = scoreWhy(me.why_i_run, other.why_i_run)

  const score = Math.min(100, Math.max(0, cityPts + pacePts + levelPts + whyPts))

  // Serve almeno un segnale concreto in comune
  if (cityPts + pacePts + levelPts + whyPts === 0) return null

  // Costruisci i motivi leggibili (priorità: città → ritmo → livello → motivazioni)
  const reasons: string[] = []
  if (cityPts >= 20 && other.city) reasons.push(`Corre a ${other.city}`)
  if (pacePts >= 10 && other.pace_min) reasons.push(`Ritmo simile · ~${formatPace(other.pace_min, other.pace_max)}`)
  if (levelPts >= 20 && other.level) reasons.push('Stesso livello')
  const sharedWhy = whyOverlap(me.why_i_run ?? [], other.why_i_run ?? [])
    .map(w => WHY_LABELS[w]).filter(Boolean)
  if (sharedWhy.length > 0) reasons.push(`Anche per ${sharedWhy[0]}`)

  let label: string
  if (score >= 78)      label = 'Ottima sintonia'
  else if (score >= 62) label = 'Molto compatibile'
  else if (score >= 45) label = 'Compatibile'
  else return null      // sotto soglia: non proporre

  return { profile: other, score, label, reasons: reasons.slice(0, 3) }
}

/**
 * Ordina una lista di candidati per compatibilità con `me` e restituisce i primi `limit`.
 * Pura: i candidati vanno recuperati a monte (rispettando le RLS su `profiles`).
 */
export function rankRunners(me: Profile, candidates: Profile[], limit = 12): RunnerMatch[] {
  return candidates
    .map(c => computeRunnerMatch(me, c))
    .filter((m): m is RunnerMatch => m !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
