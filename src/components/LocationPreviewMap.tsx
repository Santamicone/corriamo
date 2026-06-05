'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  lat: number
  lng: number
  label: string
  onPositionChange?: (lat: number, lng: number) => void
}

const PIN_SVG = `
  <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26s16-15.333 16-26C32 7.163 24.837 0 16 0z"
          fill="#EA580C" stroke="white" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="7" fill="white"/>
  </svg>`

export default function LocationPreviewMap({ lat, lng, label, onPositionChange }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<import('leaflet').Map | null>(null)
  const markerRef     = useRef<import('leaflet').Marker | null>(null)
  const onChangeRef   = useRef(onPositionChange)
  const isFirstUpdate = useRef(true)

  // Mantieni il callback sempre aggiornato senza ricreate il marker
  useEffect(() => { onChangeRef.current = onPositionChange }, [onPositionChange])

  /* ── Inizializzazione (una volta sola) ── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      if (!containerRef.current) return

      const map = L.map(containerRef.current, {
        center:             [lat, lng],
        zoom:               15,
        zoomControl:        true,
        scrollWheelZoom:    false,
        attributionControl: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        html: PIN_SVG, className: '',
        iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44],
      })

      const marker = L.marker([lat, lng], { icon, draggable: true })
        .addTo(map)
        .bindPopup(`<strong>${label}</strong>`, { closeButton: false })
        .openPopup()

      // Callback quando l'utente trascina il pin
      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChangeRef.current?.(pos.lat, pos.lng)
      })

      markerRef.current = marker
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current    = null
      markerRef.current = null
      isFirstUpdate.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Aggiorna posizione quando cambiano lat/lng dall'esterno ── */
  useEffect(() => {
    // Salta il primo render (già gestito dall'init)
    if (isFirstUpdate.current) { isFirstUpdate.current = false; return }
    if (!mapRef.current || !markerRef.current) return

    import('leaflet').then(L => {
      if (!markerRef.current || !mapRef.current) return
      const latlng = L.latLng(lat, lng)
      markerRef.current.setLatLng(latlng)
      markerRef.current.getPopup()?.setContent(`<strong>${label}</strong>`)
      mapRef.current.setView(latlng, 15, { animate: true })
    })
  }, [lat, lng, label])

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 z-0 cursor-grab active:cursor-grabbing"
        style={{ height: '240px' }}
      />
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">open_with</span>
        Trascina il pin per posizionarlo con precisione sul punto di ritrovo esatto.
      </p>
    </div>
  )
}
