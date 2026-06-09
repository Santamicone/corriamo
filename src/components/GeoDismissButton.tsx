'use client'

import { useRouter } from 'next/navigation'

export const GEO_DISMISSED_KEY = 'geo_dismissed'

export function GeoDismissButton({ href }: { href: string }) {
  const router = useRouter()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    // Segnala al GeolocCityDetector di non re-applicare il filtro in questa sessione
    sessionStorage.setItem(GEO_DISMISSED_KEY, '1')
    router.push(href)
  }

  return (
    <button
      onClick={handleClick}
      className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
      aria-label="Vedi tutte le città"
    >
      <span className="material-symbols-outlined text-sm">close</span>
    </button>
  )
}
