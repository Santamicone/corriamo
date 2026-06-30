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
