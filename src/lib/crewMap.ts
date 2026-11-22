import type { SupabaseClient } from '@supabase/supabase-js'
import type { CrewType } from '@/lib/types'
import { slugify } from '@/lib/utils'

/**
 * Mappa delle crew (docs/MAPPA-CREW.md). Lettura tramite la funzione `crews_in_bbox` (SQL #49),
 * lo stesso contratto che userà l'app. Restituisce solo campi pubblici e coordinate GIÀ
 * arrotondate dal database.
 */
export interface CrewMapPoint {
  id: string
  slug: string | null
  name: string
  crew_type: CrewType
  city: string | null
  zone: string | null
  lat: number
  lng: number
  avatar_url: string | null
  /** 'unclaimed' | 'claimed' | 'verified'; valori sconosciuti si trattano come 'claimed' */
  trust_level: string
  /** Ha un proprietario/gestore: solo allora si può chiedere di entrare */
  has_manager: boolean
}

/** Italia (con margine): la Fase 1 carica tutto in un colpo, sono poche schede. */
const ITALY_BBOX = { minLat: 35, minLng: 6, maxLat: 48, maxLng: 19 }

/**
 * Carica le crew sulla mappa. Se lo SQL #49 non è ancora applicato la funzione non esiste:
 * si risponde con un elenco vuoto invece di rompere la pagina.
 */
export async function fetchCrewMapPoints(supabase: SupabaseClient): Promise<CrewMapPoint[]> {
  const { data, error } = await supabase.rpc('crews_in_bbox', {
    p_min_lat: ITALY_BBOX.minLat,
    p_min_lng: ITALY_BBOX.minLng,
    p_max_lat: ITALY_BBOX.maxLat,
    p_max_lng: ITALY_BBOX.maxLng,
    p_limit: 1000,
  })
  if (error) {
    console.warn('[crewMap] crews_in_bbox non disponibile:', error.message)
    return []
  }
  return (data ?? []) as CrewMapPoint[]
}

/** Slug della città per le pagine /crew/citta/[city] */
export const citySlug = (city: string) => slugify(city)

/** Raggruppa per città (solo con città valorizzata), ordinate per numero di crew. */
export function groupByCity(points: CrewMapPoint[]): { city: string; slug: string; count: number }[] {
  const map = new Map<string, { city: string; slug: string; count: number }>()
  for (const p of points) {
    const city = p.city?.trim()
    if (!city) continue
    const slug = citySlug(city)
    if (!slug) continue
    const cur = map.get(slug)
    if (cur) cur.count += 1
    else map.set(slug, { city, slug, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, 'it'))
}

/** Percorso della scheda: preferisce lo slug personalizzato, altrimenti l'id. */
export const crewHref = (c: { id: string; slug: string | null }) => `/crew/${c.slug ?? c.id}`
