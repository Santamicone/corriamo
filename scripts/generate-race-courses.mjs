/**
 * Genera il catalogo dei percorsi di gara precaricati a partire dai file GPX
 * in `scripts/race-courses-gpx/`.
 *
 * Per ogni GPX estrae i track point, calcola i segmenti chilometrici (stessa
 * logica di `src/lib/running/gpx.ts`, qui duplicata per restare un tool di
 * build senza dipendenze) e scrive `src/lib/running/raceCourses.generated.ts`
 * con i percorsi pre-parsati (compatti: una riga per km). Il file generato è
 * versionato e importato dal client — nessun parsing GPX a runtime.
 *
 * Uso:  npm run gen:courses
 *
 * Per aggiungere una gara: droppa il .gpx in `scripts/race-courses-gpx/`
 * (il nome file diventa la città, es. `Chicago.gpx`) e rilancia lo script.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = join(__dirname, 'race-courses-gpx')
const OUT_FILE = join(__dirname, '..', 'src', 'lib', 'running', 'raceCourses.generated.ts')

const ELEVATION_NOISE_M = 1.5
const EARTH_RADIUS_M = 6_371_000

function haversine(a, b) {
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

function extractPoints(gpx) {
  const points = []
  const trkptRe = /<trkpt\b[^>]*?\blat="([-\d.]+)"[^>]*?\blon="([-\d.]+)"[^>]*?>([\s\S]*?)<\/trkpt>/gi
  const eleRe = /<ele>\s*([-\d.]+)\s*<\/ele>/i
  let m
  while ((m = trkptRe.exec(gpx)) !== null) {
    const lat = Number(m[1])
    const lon = Number(m[2])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const eleMatch = m[3].match(eleRe)
    const ele = eleMatch ? Number(eleMatch[1]) : null
    points.push({ lat, lon, ele: Number.isFinite(ele) ? ele : null })
  }
  return points
}

function extractName(gpx) {
  const m = gpx.match(/<metadata>[\s\S]*?<name>\s*([\s\S]*?)\s*<\/name>/i) || gpx.match(/<name>\s*([\s\S]*?)\s*<\/name>/i)
  return m ? m[1].trim() : null
}

function parseGpx(gpx) {
  const points = extractPoints(gpx)
  if (points.length < 2) throw new Error('GPX senza percorso leggibile.')

  const hasElevation = points.some(p => p.ele !== null)
  let cumDistance = 0
  let totalAscent = 0
  let totalDescent = 0
  let refEle = points.find(p => p.ele !== null)?.ele ?? null
  let segStart = 0
  let segAscent = 0
  let segDescent = 0
  const segments = []

  const closeSegment = endDistance => {
    const distanceM = endDistance - segStart
    if (distanceM <= 0) return
    const net = segAscent - segDescent
    const gradePct = (net / distanceM) * 100
    segments.push({
      km: segments.length + 1,
      distanceM: Math.round(distanceM),
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
    while (cumDistance - segStart >= 1000) closeSegment(segStart + 1000)
  }

  const tail = cumDistance - segStart
  if (tail >= 200) {
    closeSegment(cumDistance)
  } else if (tail > 0 && segments.length > 0) {
    const last = segments[segments.length - 1]
    last.distanceM += Math.round(tail)
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

/** Slug ASCII per gli id (es. "New York" → "new-york"). */
function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const files = readdirSync(SRC_DIR).filter(f => f.toLowerCase().endsWith('.gpx')).sort()
if (files.length === 0) {
  console.error(`Nessun file .gpx in ${SRC_DIR}`)
  process.exit(1)
}

const courses = files.map(file => {
  const city = basename(file, '.gpx')
  const gpx = readFileSync(join(SRC_DIR, file), 'utf8')
  const parsed = parseGpx(gpx)
  const rawName = extractName(gpx) || city
  // Nome ufficiale ripulito dalla distanza in coda (es. " - 42.195 km")
  // e dall'anno (es. "Venice Marathon 2025" → "Venice Marathon").
  const name = rawName
    .replace(/\s*[-–]\s*\d+([.,]\d+)?\s*km\s*$/i, '')
    .replace(/\s+(19|20)\d{2}\s*$/, '')
    .trim()
  const km = parsed.distanceM / 1000
  console.log(`✓ ${city}: ${km.toFixed(2)} km, D+${parsed.ascentM} / D−${parsed.descentM} m (${parsed.segments.length} split)`)
  return {
    id: slugify(city),
    city,
    name,
    country: '',
    ...parsed,
  }
})

const header = `/**
 * Catalogo dei percorsi di gara precaricati.
 *
 * ⚠ FILE GENERATO — non modificare a mano.
 * Rigenerato da \`npm run gen:courses\` a partire dai GPX in
 * \`scripts/race-courses-gpx/\`. Vedi \`scripts/generate-race-courses.mjs\`.
 */

import type { ParsedCourse } from './gpx'

export interface RaceCourse extends ParsedCourse {
  /** Slug stabile usato come chiave (es. "new-york"). */
  id: string
  /** Città, dal nome del file GPX. */
  city: string
  /** Nome ufficiale della gara, dal tag <name> del GPX. */
  name: string
  /** Paese (facoltativo, per ora vuoto — compilabile a mano se serve). */
  country: string
}

export const RACE_COURSES: RaceCourse[] = ${JSON.stringify(courses, null, 2)}
`

writeFileSync(OUT_FILE, header, 'utf8')
console.log(`\n→ ${courses.length} percorsi scritti in ${OUT_FILE}`)
