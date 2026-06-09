'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const LS_CITY    = 'geo_city'
const LS_TS      = 'geo_city_ts'
const LS_DENIED  = 'geo_denied'
const SS_DISMISSED = 'geo_dismissed'   // sessionStorage: utente ha rimosso il filtro manualmente
const CACHE_TTL  = 7 * 24 * 60 * 60 * 1000  // 7 giorni

interface Props {
  currentCityParam: string | undefined
}

export function GeolocCityDetector({ currentCityParam }: Props) {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    // Se c'è già un filtro città attivo non fare nulla
    if (currentCityParam) return
    if (typeof window === 'undefined') return
    if (!navigator.geolocation) return

    // Utente ha rimosso il filtro manualmente in questa sessione → non re-applicare
    if (sessionStorage.getItem(SS_DISMISSED)) return

    // Città già in cache?
    const cachedCity = localStorage.getItem(LS_CITY)
    const cachedTs   = parseInt(localStorage.getItem(LS_TS) ?? '0', 10)
    const cacheValid = cachedCity && Date.now() - cachedTs < CACHE_TTL
    if (cacheValid) {
      router.replace(`/bacheca?city=${encodeURIComponent(cachedCity)}&geo=1`)
      return
    }

    // Utente aveva negato il permesso?
    if (localStorage.getItem(LS_DENIED)) return

    // Controlla stato permesso senza mostrare il dialog nativo
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        if (status.state === 'granted') {
          // Già autorizzato: rileva silenziosamente
          detectSilently()
        } else if (status.state === 'prompt') {
          setShowBanner(true)
        }
        // 'denied' → non fare nulla
      }).catch(() => {
        // Permissions API non supportata (es. Safari vecchio) → mostra banner
        setShowBanner(true)
      })
    } else {
      // Fallback (Safari) → mostra banner
      setShowBanner(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCityParam])

  function detectSilently() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        if (city) {
          localStorage.setItem(LS_CITY, city)
          localStorage.setItem(LS_TS, Date.now().toString())
          router.replace(`/bacheca?city=${encodeURIComponent(city)}&geo=1`)
        }
      },
      () => { /* silenzioso */ },
      { timeout: 8000, maximumAge: 300_000 }
    )
  }

  async function handleDetect() {
    setDetecting(true)
    setError(false)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const city = await reverseGeocode(pos.coords.latitude, pos.coords.longitude)
        if (city) {
          localStorage.setItem(LS_CITY, city)
          localStorage.setItem(LS_TS, Date.now().toString())
          router.push(`/bacheca?city=${encodeURIComponent(city)}&geo=1`)
        } else {
          setDetecting(false)
          setError(true)
        }
      },
      () => {
        localStorage.setItem(LS_DENIED, '1')
        setShowBanner(false)
        setDetecting(false)
      },
      { timeout: 8000, maximumAge: 300_000 }
    )
  }

  function handleDismiss() {
    localStorage.setItem(LS_DENIED, '1')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
      <span className="material-symbols-outlined text-blue-500 text-xl shrink-0">near_me</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Corse vicino a te</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {error
            ? 'Posizione non disponibile. Usa il filtro città.'
            : 'Vuoi vedere solo le corse nella tua zona?'}
        </p>
      </div>
      {!error && (
        <button
          onClick={handleDetect}
          disabled={detecting}
          className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
        >
          {detecting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Rilevamento…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">my_location</span>
              Usa posizione
            </>
          )}
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Chiudi"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  )
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/reverse-geocode?lat=${lat}&lng=${lng}`,
      { signal: AbortSignal.timeout(7000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.city ?? null
  } catch {
    return null
  }
}
