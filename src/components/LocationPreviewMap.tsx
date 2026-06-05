'use client'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

interface Props {
  lat: number
  lng: number
  label: string
}

export default function LocationPreviewMap({ lat, lng, label }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import('leaflet').Map | null>(null)
  const markerRef    = useRef<import('leaflet').Marker | null>(null)

  useEffect(() => {
    import('leaflet').then(L => {
      // Prima inizializzazione
      if (!mapRef.current && containerRef.current) {
        const map = L.map(containerRef.current, {
          center:            [lat, lng],
          zoom:              15,
          zoomControl:       true,
          scrollWheelZoom:   false,
          attributionControl: false,
        })
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map)

        const icon = L.divIcon({
          html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26s16-15.333 16-26C32 7.163 24.837 0 16 0z"
                  fill="#EA580C" stroke="white" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
          </svg>`,
          className:   '',
          iconSize:    [32, 42],
          iconAnchor:  [16, 42],
          popupAnchor: [0, -44],
        })

        markerRef.current = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${label}</strong>`, { closeButton: false })
          .openPopup()
      } else if (mapRef.current && markerRef.current) {
        // Aggiorna posizione se le coordinate cambiano
        const latlng = L.latLng(lat, lng)
        markerRef.current.setLatLng(latlng)
        markerRef.current.getPopup()?.setContent(`<strong>${label}</strong>`)
        mapRef.current.setView(latlng, 15, { animate: true })
      }
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current  = null
      markerRef.current = null
    }
  }, [lat, lng, label])

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden border border-gray-200 z-0"
      style={{ height: '220px' }}
    />
  )
}
