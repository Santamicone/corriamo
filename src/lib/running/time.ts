/**
 * Utility per tempi e ritmi di corsa.
 * Tutto in secondi internamente; parsing/formatting ai bordi.
 */

/** Parsa "mm:ss", "h:mm:ss" o "hh:mm:ss" → secondi. null se non valido. */
export function parseTime(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null
  const parts = raw.split(':').map(p => p.trim())
  if (parts.some(p => p === '' || !/^\d+$/.test(p))) return null

  let h = 0, m = 0, s = 0
  if (parts.length === 2) {
    ;[m, s] = parts.map(Number)
  } else if (parts.length === 3) {
    ;[h, m, s] = parts.map(Number)
  } else {
    return null
  }
  if (s >= 60 || m >= 60) return null
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

/** Secondi → "h:mm:ss" (se ≥ 1h) oppure "mm:ss". */
export function formatTime(totalSeconds: number): string {
  const t = Math.round(totalSeconds)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Ritmo (secondi/km) → "m:ss". */
export function formatPace(secPerKm: number): string {
  const t = Math.round(secPerKm)
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Range di ritmo "m:ss-m:ss/km" da due valori in secondi/km (ordine indifferente). */
export function formatPaceRange(a: number, b: number): string {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return `${formatPace(lo)}-${formatPace(hi)}/km`
}

/** Metri in un miglio terrestre. */
export const METERS_PER_MILE = 1609.344

/**
 * Parsing "intelligente" del passo: accetta "4:30", "430", "4.30" → secondi/km.
 * Le ultime due cifre sono i secondi, il resto i minuti. null se non valido.
 */
export function parsePace(input: string): number | null {
  const raw = input.trim().replace(/[.,]/g, ':')
  if (!raw) return null
  if (raw.includes(':')) {
    const parts = raw.split(':')
    if (parts.length !== 2) return null
    if (parts.some(p => p === '' || !/^\d+$/.test(p))) return null
    const [m, s] = parts.map(Number)
    if (s >= 60) return null
    const total = m * 60 + s
    return total > 0 ? total : null
  }
  if (!/^\d+$/.test(raw)) return null
  const digits = raw.padStart(3, '0')
  const s = Number(digits.slice(-2))
  const m = Number(digits.slice(0, -2))
  if (s >= 60) return null
  const total = m * 60 + s
  return total > 0 ? total : null
}

/**
 * Parsing "intelligente" del tempo senza due punti: "4500" → 45:00, "13000" → 1:30:00.
 * Riempie da destra ss → mm → hh. Accetta anche il formato con ":" via parseTime.
 * null se non valido.
 */
export function parseSmartTime(input: string): number | null {
  const raw = input.trim()
  if (!raw) return null
  if (raw.includes(':')) return parseTime(raw)
  if (!/^\d+$/.test(raw)) return null
  const digits = raw.padStart(4, '0').slice(-6)
  const s = Number(digits.slice(-2))
  const m = Number(digits.slice(-4, -2))
  const h = Number(digits.slice(0, -4) || '0')
  if (s >= 60 || m >= 60) return null
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

/**
 * Parsing "intelligente" della distanza → metri.
 * Regole: suffisso mi/miglia → miglia; suffisso m → metri; km/nessun suffisso →
 * se intero ≥ 100 lo interpreta come metri, altrimenti km. null se non valido.
 */
export function parseDistance(input: string): number | null {
  const raw = input.trim().toLowerCase().replace(',', '.')
  if (!raw) return null
  const match = raw.match(/^([\d.]+)\s*(mi|miglia|miglio|km|m|metri)?$/)
  if (!match) return null
  const value = Number(match[1])
  if (!isFinite(value) || value <= 0) return null
  const unit = match[2]
  if (unit === 'mi' || unit === 'miglia' || unit === 'miglio') return value * METERS_PER_MILE
  if (unit === 'm' || unit === 'metri') return value
  if (unit === 'km') return value * 1000
  // Nessuna unità: euristica intero ≥ 100 = metri, altrimenti km.
  if (Number.isInteger(value) && value >= 100) return value
  return value * 1000
}

/** Metri → stringa km compatta "21,097 km" o "800 m". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  const str = km.toFixed(3).replace(/\.?0+$/, '').replace('.', ',')
  return `${str} km`
}
