import { NextResponse } from 'next/server'
import { guardAdminApi } from '@/lib/admin/api-guard'
import { geocodeAddress, geocodeCity, getCityFallback } from '@/lib/geocoding'

export const runtime = 'nodejs'
export const maxDuration = 60

type Item = { key: string; city: string; meeting_point: string | null; precision: 'area' | 'city' }
type Point = { lat: number; lng: number } | null

const MAX_ITEMS = 15
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Cerca la posizione (centro della città, o ritrovo se indicato) per un blocco di righe.
 * Nominatim consente circa 1 richiesta al secondo: le città note si risolvono da una tabella locale
 * senza rete, le altre si distanziano di ~1,1 s, e il client manda al massimo 15 righe per volta.
 * Il database arrotonda comunque le coordinate in base alla precisione: qui si trova solo "dove".
 */
export async function POST(request: Request) {
  try {
    const guard = await guardAdminApi(false)
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

    const body = (await request.json().catch(() => null)) as { items?: Item[] } | null
    const items = body?.items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Nessuna riga da geolocalizzare' }, { status: 400 })
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Al massimo ${MAX_ITEMS} righe per volta` }, { status: 400 })
    }

    const results: Record<string, Point> = {}
    const cache = new Map<string, Point>()
    let lastNetworkCall = 0

    for (const it of items) {
      const city = String(it.city ?? '').trim()
      const meeting = it.precision === 'area' ? String(it.meeting_point ?? '').trim() : ''
      if (!it.key || !city) { results[it.key] = null; continue }

      const cacheKey = `${city.toLowerCase()}|${meeting.toLowerCase()}`
      if (cache.has(cacheKey)) { results[it.key] = cache.get(cacheKey)!; continue }

      let point: Point = null
      const local = !meeting ? getCityFallback(city) : null
      if (local) {
        point = local
      } else {
        const wait = 1100 - (Date.now() - lastNetworkCall)
        if (wait > 0) await sleep(wait)
        lastNetworkCall = Date.now()
        const geo = meeting ? await geocodeAddress(meeting, city) : await geocodeCity(city)
        point = geo ? { lat: geo.lat, lng: geo.lng } : null
      }
      cache.set(cacheKey, point)
      results[it.key] = point
    }

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[crew/importa/geocodifica] errore:', e)
    return NextResponse.json({ error: (e as Error)?.message ?? 'Errore interno' }, { status: 500 })
  }
}
