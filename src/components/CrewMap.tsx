'use client'
import { useEffect, useRef } from 'react'
import type * as Leaflet from 'leaflet'
import { CREW_TYPE_LABELS } from '@/lib/types'
import { crewHref, type CrewMapPoint } from '@/lib/crewMap'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

/* ── Colori dei pin: la verifica è solo un'informazione, non un vantaggio (docs/MAPPA-CREW.md) ── */
const COLOR_MANAGED = '#EA580C'   // crew su Vieni a correre
const COLOR_VERIFIED = '#16A34A'  // verificata
const COLOR_INFO = '#9CA3AF'      // scheda informativa (senza gestore)

export function pinColor(p: Pick<CrewMapPoint, 'has_manager' | 'trust_level'>): string {
  if (!p.has_manager) return COLOR_INFO
  return p.trust_level === 'verified' ? COLOR_VERIFIED : COLOR_MANAGED
}

function pinSvg(color: string) {
  return `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10.667 16 26 16 26s16-15.333 16-26C32 7.163 24.837 0 16 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="7" fill="white"/>
    </svg>`
}

/** Nomi e città li scrivono gli utenti: vanno resi innocui prima di finire in HTML. */
function esc(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ))
}

function popupHtml(p: CrewMapPoint): string {
  const type = CREW_TYPE_LABELS[p.crew_type]?.name ?? 'Crew'
  const where = [p.city, p.zone ? `(${p.zone})` : ''].filter(Boolean).join(' ')
  const note = p.has_manager
    ? ''
    : `<p style="font-size:11px;color:#6b7280;margin:6px 0 0;">Scheda informativa: la crew non è ancora su Vieni a correre.</p>`
  return `
    <div style="min-width:200px;max-width:260px;font-family:sans-serif;padding:2px 0;">
      <p style="font-size:14px;font-weight:800;color:#111827;margin:0 0 2px;">${esc(p.name)}</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 10px;">${esc(type)}${where ? ` · ${esc(where)}` : ''}</p>
      <a href="${esc(crewHref(p))}"
         style="display:inline-flex;align-items:center;gap:4px;background:#ea580c;color:white;
                text-decoration:none;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;">
        Vedi la crew →
      </a>
      ${note}
    </div>`
}

interface Props {
  points: CrewMapPoint[]
  height?: string
}

export default function CrewMap({ points, height = '560px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    // Leaflet e il plugin dei cluster non sono SSR-safe; il plugin cerca `L` globale
    ;(async () => {
      const L = (await import('leaflet')).default
      ;(window as unknown as { L: typeof L }).L = L
      await import('leaflet.markercluster')
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, { center: [42.5, 12.5], zoom: 6, scrollWheelZoom: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      if (points.length === 0) return

      const clusterFactory = (L as unknown as {
        markerClusterGroup: (options?: object) => Leaflet.FeatureGroup
      }).markerClusterGroup
      const cluster = clusterFactory({ showCoverageOnHover: false, maxClusterRadius: 50 })

      for (const p of points) {
        const icon = L.divIcon({
          html: pinSvg(pinColor(p)),
          className: '',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -44],
        })
        const marker = L.marker([p.lat, p.lng], { icon, title: p.name })
        marker.bindPopup(popupHtml(p), { maxWidth: 300 })
        cluster.addLayer(marker)
      }
      cluster.addTo(map)

      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], 12)
      } else {
        map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])), { padding: [48, 48] })
      }
    })()

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0"
      role="region"
      aria-label="Mappa delle crew"
    />
  )
}
