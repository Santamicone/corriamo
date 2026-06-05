/**
 * Geocoding tramite Nominatim (OpenStreetMap) — gratuito, no API key.
 * Restituisce {lat, lng} oppure null se non trovato o in caso di errore.
 *
 * Rate limit: 1 req/s — da usare solo alla creazione della corsa, non in loop.
 */
export interface GeoResult {
  lat: number
  lng: number
  display_name: string   // indirizzo completo restituito da Nominatim
}

export async function geocodeAddress(
  location: string,
  city: string
): Promise<GeoResult | null> {
  try {
    // Strategia 1: luogo preciso + città
    const query1 = `${location}, ${city}, Italia`
    const result = await nominatimSearch(query1)
    if (result) return result

    // Strategia 2: fallback solo città (almeno il pin è nella zona giusta)
    const result2 = await nominatimSearch(`${city}, Italia`)
    return result2
  } catch {
    return null
  }
}

async function nominatimSearch(query: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=it`
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'it',
        'User-Agent': 'vieniacorrere.it/1.0 (contact@vieniacorrere.it)',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.length === 0) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name ?? '',
    }
  } catch {
    return null
  }
}

/** Coordinate approssimative delle principali città italiane (fallback) */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'roma':     { lat: 41.9028, lng: 12.4964 },
  'milano':   { lat: 45.4654, lng: 9.1859 },
  'napoli':   { lat: 40.8518, lng: 14.2681 },
  'torino':   { lat: 45.0703, lng: 7.6869 },
  'palermo':  { lat: 38.1157, lng: 13.3615 },
  'genova':   { lat: 44.4056, lng: 8.9463 },
  'bologna':  { lat: 44.4949, lng: 11.3426 },
  'firenze':  { lat: 43.7696, lng: 11.2558 },
  'bari':     { lat: 41.1171, lng: 16.8719 },
  'catania':  { lat: 37.5079, lng: 15.0830 },
  'venezia':  { lat: 45.4408, lng: 12.3155 },
  'verona':   { lat: 45.4384, lng: 10.9916 },
  'perugia':  { lat: 43.1107, lng: 12.3908 },
  'trieste':  { lat: 45.6495, lng: 13.7768 },
  'trento':   { lat: 46.0748, lng: 11.1217 },
  'brescia':  { lat: 45.5416, lng: 10.2118 },
  'parma':    { lat: 44.8015, lng: 10.3279 },
  'modena':   { lat: 44.6471, lng: 10.9252 },
  'reggio calabria': { lat: 38.1114, lng: 15.6617 },
  'livorno':  { lat: 43.5480, lng: 10.3110 },
  'cagliari': { lat: 39.2238, lng: 9.1217 },
  'foggia':   { lat: 41.4621, lng: 15.5444 },
  'salerno':  { lat: 40.6824, lng: 14.7681 },
  'ferrara':  { lat: 44.8381, lng: 11.6197 },
  'rimini':   { lat: 44.0678, lng: 12.5695 },
  'ravenna':  { lat: 44.4184, lng: 12.2035 },
  'siracusa': { lat: 37.0755, lng: 15.2866 },
  'bergamo':  { lat: 45.6983, lng: 9.6773 },
  'latina':   { lat: 41.4677, lng: 12.9035 },
  'vicenza':  { lat: 45.5455, lng: 11.5354 },
  'terni':    { lat: 42.5631, lng: 12.6430 },
  'forlì':    { lat: 44.2226, lng: 12.0408 },
  'pesaro':   { lat: 43.9100, lng: 12.9133 },
  'ancona':   { lat: 43.6158, lng: 13.5189 },
  'udine':    { lat: 46.0711, lng: 13.2343 },
  'pisa':     { lat: 43.7228, lng: 10.4017 },
  'assisi':   { lat: 43.0707, lng: 12.6197 },
}

export function getCityFallback(city: string): { lat: number; lng: number } | null {
  return CITY_COORDS[city.toLowerCase().trim()] ?? null
}
