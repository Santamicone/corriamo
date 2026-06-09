import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ city: null }, { status: 400 })
  }

  const latN = parseFloat(lat)
  const lngN = parseFloat(lng)
  if (isNaN(latN) || isNaN(lngN)) {
    return NextResponse.json({ city: null }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latN}&lon=${lngN}&format=json&zoom=10&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'it',
        'User-Agent': 'vieniacorrere.it/1.0 (contact@vieniacorrere.it)',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) return NextResponse.json({ city: null })

    const data = await res.json()
    const addr = data?.address ?? {}

    // Priorità: city > town > municipality > village > county
    const city =
      addr.city ??
      addr.town ??
      addr.municipality ??
      addr.village ??
      null

    // Provincia / area metropolitana — usata come fallback se la città ha 0 risultati
    const county = addr.county ?? null

    return NextResponse.json(
      { city, county },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    )
  } catch {
    return NextResponse.json({ city: null })
  }
}
