/**
 * Parsing di un file GPX in segmenti chilometrici.
 *
 * Estrae i track point (lat/lon/quota), calcola la distanza con la formula
 * dell'emisenoverso (haversine) e raggruppa il percorso in segmenti da 1 km,
 * sommando dislivello positivo e negativo di ciascun km.
 *
 * Il parsing usa espressioni regolari sul testo XML: funziona identico su
 * client e server, senza dipendere da `DOMParser` (non disponibile in SSR).
 */

import type { CourseSegment } from './raceStrategy'

interface TrackPoint {
  lat: number
  lon: number
  ele: number | null
}

/** Soglia (m) sotto la quale una variazione di quota è considerata rumore GPS. */
const ELEVATION_NOISE_M = 1.5

const EARTH_RADIUS_M = 6_371_000

export interface ParsedCourse {
  distanceM: number
  ascentM: number
  descentM: number
  segments: CourseSegment[]
  hasElevation: boolean
}

/** Distanza in metri fra due coordinate (haversine). */
function haversine(a: TrackPoint, b: TrackPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Estrae i track point da una stringa GPX. Ritorna [] se non ne trova. */
function extractPoints(gpx: string): TrackPoint[] {
  const points: TrackPoint[] = []
  // <trkpt lat="..." lon="..."> ... <ele>...</ele> ... </trkpt>
  const trkptRe = /<trkpt\b[^>]*?\blat="([-\d.]+)"[^>]*?\blon="([-\d.]+)"[^>]*?>([\s\S]*?)<\/trkpt>/gi
  const eleRe = /<ele>\s*([-\d.]+)\s*<\/ele>/i

  let m: RegExpExecArray | null
  while ((m = trkptRe.exec(gpx)) !== null) {
    const lat = Number(m[1])
    const lon = Number(m[2])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const eleMatch = m[3].match(eleRe)
    const ele = eleMatch ? Number(eleMatch[1]) : null
    points.push({ lat, lon, ele: Number.isFinite(ele as number) ? ele : null })
  }
  return points
}

/**
 * Analizza un file GPX e restituisce i segmenti chilometrici.
 * Lancia un errore se il file non contiene un percorso valido.
 */
export function parseGpx(gpx: string): ParsedCourse {
  const points = extractPoints(gpx)
  if (points.length < 2) {
    throw new Error('Il file GPX non contiene un percorso leggibile.')
  }

  const hasElevation = points.some(p => p.ele !== null)

  let cumDistance = 0
  let totalAscent = 0
  let totalDescent = 0

  // Isteresi altimetrica: si registra un dislivello solo quando lo scarto dalla
  // quota di riferimento supera la soglia, poi la riferimento si sposta. Così le
  // salite graduali (tanti piccoli step) vengono catturate, il rumore GPS no.
  let refEle: number | null = points.find(p => p.ele !== null)?.ele ?? null

  // Accumulatori del km corrente.
  let segStart = 0 // distanza di inizio del km corrente
  let segAscent = 0
  let segDescent = 0
  const segments: CourseSegment[] = []

  const closeSegment = (endDistance: number) => {
    const distanceM = endDistance - segStart
    if (distanceM <= 0) return
    const net = segAscent - segDescent
    const gradePct = (net / distanceM) * 100
    segments.push({
      km: segments.length + 1,
      distanceM,
      ascentM: Math.round(segAscent),
      descentM: Math.round(segDescent),
      gradePct: Math.round(gradePct * 10) / 10,
    })
    segStart = endDistance
    segAscent = 0
    segDescent = 0
  }

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const step = haversine(prev, cur)
    if (!Number.isFinite(step) || step <= 0) continue

    // Dislivello con isteresi rispetto alla quota di riferimento.
    if (cur.ele !== null) {
      if (refEle === null) {
        refEle = cur.ele
      } else {
        const diff = cur.ele - refEle
        if (diff >= ELEVATION_NOISE_M) {
          totalAscent += diff
          segAscent += diff
          refEle = cur.ele
        } else if (diff <= -ELEVATION_NOISE_M) {
          totalDescent += -diff
          segDescent += -diff
          refEle = cur.ele
        }
      }
    }

    cumDistance += step
    // Chiudi tutti i km superati da questo tratto.
    while (cumDistance - segStart >= 1000) {
      closeSegment(segStart + 1000)
    }
  }

  // Ultimo tratto parziale (se ≥ 200 m, altrimenti si fonde col precedente).
  const tail = cumDistance - segStart
  if (tail >= 200) {
    closeSegment(cumDistance)
  } else if (tail > 0 && segments.length > 0) {
    const last = segments[segments.length - 1]
    last.distanceM += tail
    last.ascentM += Math.round(segAscent)
    last.descentM += Math.round(segDescent)
  } else if (tail > 0) {
    closeSegment(cumDistance)
  }

  return {
    distanceM: Math.round(cumDistance),
    ascentM: Math.round(totalAscent),
    descentM: Math.round(totalDescent),
    segments,
    hasElevation,
  }
}
