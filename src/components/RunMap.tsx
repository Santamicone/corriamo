'use client'
import { useEffect, useRef } from 'react'
import type { Run } from '@/lib/types'
import { formatPaceTarget } from '@/lib/utils'
import 'leaflet/dist/leaflet.css'

/* ── Colori pin per livello ── */
const LEVEL_COLORS: Record<string, string> = {
  tutti:        '#6B7280',
  principiante: '#16A34A',
  intermedio:   '#2563EB',
  avanzato:     '#EA580C',
}

const LEVEL_LABELS: Record<string, string> = {
  tutti: 'Tutti i livelli',
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzato: 'Avanzato',
}

/** SVG teardrop pin con cerchio bianco interno */
function pinSvg(color: string, count = 1, isPrivate = false) {
  const badge = count > 1
    ? `<rect x="16" y="0" width="16" height="16" rx="8" fill="#EA580C"/>
       <text x="24" y="11" font-family="sans-serif" font-size="9" font-weight="700" fill="white" text-anchor="middle">${count}</text>`
    : ''
  const strokeDash = isPrivate ? 'stroke-dasharray="4,2"' : ''
  const innerContent = isPrivate
    ? `<text x="16" y="21" font-family="sans-serif" font-size="12" text-anchor="middle" fill="${color}">🔒</text>`
    : `<circle cx="16" cy="16" r="7" fill="white"/>`
  return `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26s16-15.333 16-26C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="1.5" ${strokeDash}/>
      ${innerContent}
      ${badge}
    </svg>`
}

interface RunMapProps {
  runs: Run[]
  height?: string
}

export default function RunMap({ runs, height = '480px' }: RunMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)

  // Corse con coordinate (lat/lng)
  const runsWithCoords = runs.filter(
    r => (r as Run & { lat?: number; lng?: number }).lat != null &&
         (r as Run & { lat?: number; lng?: number }).lng != null
  ) as (Run & { lat: number; lng: number })[]

  const runsWithout = runs.length - runsWithCoords.length

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Import dinamico — Leaflet non è SSR-safe
    import('leaflet').then(L => {

      const map = L.map(containerRef.current!, {
        center: [42.5, 12.5], // Italia
        zoom: 6,
        zoomControl: true,
        scrollWheelZoom: false,
      })
      mapRef.current = map

      // Tile OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      if (runsWithCoords.length === 0) return

      // Raggruppa per coordinate identiche (più corse stesso posto)
      const grouped = new Map<string, (Run & { lat: number; lng: number })[]>()
      runsWithCoords.forEach(r => {
        const key = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`
        grouped.set(key, [...(grouped.get(key) ?? []), r])
      })

      // Crea marker per ogni gruppo
      grouped.forEach((group) => {
        const first = group[0]
        const isSpot    = (first as Run & { is_spot?: boolean }).is_spot === true
        const isPrivate = (first as Run & { location_public?: boolean }).location_public === false
        const color = isPrivate ? '#9CA3AF' : isSpot ? '#EF4444' : LEVEL_COLORS[first.level] ?? LEVEL_COLORS.tutti
        const icon = L.divIcon({
          html: pinSvg(color, group.length, isPrivate),
          className: '',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44],
        })

        const marker = L.marker([first.lat, first.lng], { icon }).addTo(map)

        // Popup content
        const popupHtml = group.map(r => `
          <div style="min-width:220px;max-width:280px;font-family:sans-serif;padding:4px 0;
                      ${group.length > 1 ? 'border-bottom:1px solid #f3f4f6;margin-bottom:8px;padding-bottom:8px;' : ''}">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="background:${LEVEL_COLORS[r.level]}20;color:${LEVEL_COLORS[r.level]};
                           padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">
                ${LEVEL_LABELS[r.level]}
              </span>
              ${r.is_no_drop ? '<span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">No drop</span>' : ''}
            </div>
            <p style="font-size:14px;font-weight:800;color:#111827;margin:0 0 6px;">
              ${r.title}
            </p>
            <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px;">
              <span style="font-size:12px;color:#6b7280;">
                📅 ${r.date.split('-').reverse().join('/')} &nbsp;·&nbsp; 🕐 ${r.time.slice(0,5)}
              </span>
              <span style="font-size:12px;color:#6b7280;">
                📍 ${(r as Run & { location_public?: boolean }).location_public === false ? `🔒 Luogo riservato · ${r.city}` : `${r.location}, ${r.city}`}
              </span>
              ${r.distance_km ? `<span style="font-size:12px;color:#6b7280;">🏃 ${r.distance_km} km${r.pace_target ? ` &nbsp;·&nbsp; ⏱ ${formatPaceTarget(r.pace_target) ?? r.pace_target}` : ''}</span>` : ''}
            </div>
            <a href="/corse/${r.id}"
               style="display:inline-flex;align-items:center;gap:4px;background:#ea580c;color:white;
                      text-decoration:none;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;">
              Vedi dettagli →
            </a>
          </div>
        `).join('')

        marker.bindPopup(`<div>${popupHtml}</div>`, {
          maxWidth: 300,
          className: 'run-popup',
        })
      })

      // Auto-fit su tutti i pin
      const bounds = L.latLngBounds(runsWithCoords.map(r => [r.lat, r.lng]))
      if (runsWithCoords.length === 1) {
        map.setView([runsWithCoords[0].lat, runsWithCoords[0].lng], 13)
      } else {
        map.fitBounds(bounds, { padding: [48, 48] })
      }
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      {/* Mappa */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0"
      />

      {/* Avviso corse senza coordinate */}
      {runsWithout > 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">info</span>
          {runsWithout === 1
            ? '1 corsa non ha ancora le coordinate e non appare sulla mappa.'
            : `${runsWithout} corse non hanno ancora le coordinate e non appaiono sulla mappa.`}
          {' '}Le nuove corse vengono geolocalizzate automaticamente.
        </p>
      )}
    </div>
  )
}
