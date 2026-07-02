/**
 * Motore "Trova la tua gara ideale" — calcolo puro sul catalogo gare.
 *
 * Filtra il catalogo su vincoli netti (distanza, orizzonte temporale, area) e
 * ordina il resto con un punteggio pesato su obiettivo e preferenze. I dati del
 * catalogo sono spesso parziali (dislivello/partecipanti nulli), quindi lo score
 * è volutamente indulgente: usa i segnali disponibili e non penalizza i mancanti.
 *
 * Nessuna dipendenza esterna: testabile in isolamento.
 */

import type { Race, CatalogDistance } from '@/lib/types'

export type MatchGoal = 'finire' | 'pb' | 'esperienza' | 'viaggio' | 'prep_maratona'
export type MatchPref = 'pianura' | 'clima_fresco' | 'gara_grande' | 'gara_piccola'

export interface MatchPrefs {
  distance?: CatalogDistance   // vincolo netto se presente
  horizonMonths?: number       // vincolo netto: gara entro N mesi
  area?: 'italia' | 'europa'   // 'italia' = solo IT (vincolo netto)
  goal?: MatchGoal
  prefs: MatchPref[]
}

export interface MatchResult {
  race: Race
  score: number
  reasons: string[]
}

const HOT_MONTHS = new Set([6, 7, 8])       // giugno-agosto
const FRESH_MONTHS = new Set([3, 4, 5, 9, 10, 11])

function monthOf(dateIso: string): number {
  return Number(dateIso.slice(5, 7))
}

function isBig(race: Race): boolean {
  if (race.circuit === 'major' || race.circuit === 'superhalfs') return true
  return race.participants_est != null && race.participants_est >= 8000
}

function isSmall(race: Race): boolean {
  return race.participants_est != null && race.participants_est < 3000
}

/** Punteggio (0..~100) + motivazioni leggibili per una singola gara. */
export function scoreRace(race: Race, prefs: MatchPrefs): MatchResult {
  let score = 10 // base
  const reasons: string[] = []
  const month = monthOf(race.event_date)

  // Obiettivo
  switch (prefs.goal) {
    case 'pb': {
      const flat = race.elevation_m != null && race.elevation_m <= 150
      const fast = race.course_profile.includes('veloce') || race.tags.includes('da_pb')
      if (flat || fast) { score += 25; reasons.push('percorso adatto al personale') }
      if (race.circuit) { score += 5 }
      break
    }
    case 'viaggio': {
      if (race.country !== 'IT') { score += 20; reasons.push('gara all’estero, bella da vivere in viaggio') }
      if (race.tags.includes('turistica') || race.circuit) { score += 10; reasons.push('meta iconica') }
      break
    }
    case 'esperienza': {
      if (race.circuit === 'major') { score += 30; reasons.push('una delle Major mondiali') }
      else if (race.circuit === 'superhalfs') { score += 25; reasons.push('circuito SuperHalfs') }
      else if (isBig(race)) { score += 12; reasons.push('grande evento partecipato') }
      break
    }
    case 'prep_maratona': {
      if (race.distances.includes('21k')) { score += 22; reasons.push('mezza, ottima come test verso la maratona') }
      else if (race.distances.includes('42k')) { score += 15; reasons.push('maratona obiettivo') }
      break
    }
    case 'finire': {
      const hilly = race.elevation_m != null && race.elevation_m > 600
      if (!hilly) { score += 12; reasons.push('percorso abbordabile per arrivare in fondo') }
      break
    }
  }

  // Preferenze
  for (const p of prefs.prefs) {
    switch (p) {
      case 'pianura':
        if (race.elevation_m != null && race.elevation_m <= 150) { score += 15; reasons.push('percorso pianeggiante') }
        else if (race.course_profile.includes('veloce') || race.course_profile.includes('cittadino')) { score += 8 }
        break
      case 'clima_fresco':
        if (FRESH_MONTHS.has(month)) { score += 12; reasons.push('periodo dal clima fresco') }
        else if (HOT_MONTHS.has(month)) { score -= 10 }
        break
      case 'gara_grande':
        if (isBig(race)) { score += 15; reasons.push('evento grande e partecipato') }
        break
      case 'gara_piccola':
        if (isSmall(race)) { score += 15; reasons.push('gara piccola e raccolta') }
        else if (race.circuit) { score -= 8 }
        break
    }
  }

  return { race, score, reasons }
}

/**
 * Applica i vincoli netti (distanza/area/orizzonte) e restituisce la shortlist
 * ordinata per punteggio decrescente.
 */
export function matchRaces(races: Race[], prefs: MatchPrefs, limit = 5): MatchResult[] {
  const now = new Date()
  const horizonDate = prefs.horizonMonths
    ? new Date(now.getFullYear(), now.getMonth() + prefs.horizonMonths, now.getDate())
    : null

  const candidates = races.filter(r => {
    if (prefs.distance && !r.distances.includes(prefs.distance)) return false
    if (prefs.area === 'italia' && r.country !== 'IT') return false
    if (horizonDate && new Date(r.event_date) > horizonDate) return false
    return true
  })

  return candidates
    .map(r => scoreRace(r, prefs))
    .sort((a, b) => b.score - a.score || a.race.event_date.localeCompare(b.race.event_date))
    .slice(0, limit)
}
