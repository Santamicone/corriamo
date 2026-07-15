'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistance, formatPace, formatTime } from '@/lib/running/time'
import type { AthleteStats } from '@/lib/crewStats'

type SortKey = 'distance' | 'count' | 'pace' | 'recent'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'distance', label: 'Km totali' },
  { key: 'count', label: 'N° allenamenti' },
  { key: 'pace', label: 'Passo medio' },
  { key: 'recent', label: 'Più recente' },
]

function relativeDay(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'oggi'
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

/** Timestamp dell'attività più recente dell'atleta (le attività arrivano già desc). */
function lastActivityTs(a: AthleteStats): number {
  return a.activities.length > 0 ? new Date(a.activities[0].start_date).getTime() : 0
}

/**
 * Elenco interattivo degli atleti con i loro allenamenti. Riceve le statistiche
 * già aggregate lato server (buildCrewStats) e aggiunge ricerca, ordinamento e
 * accordion per atleta — così una crew numerosa resta navigabile.
 */
export function CrewTrainingsBrowser({ athletes }: { athletes: AthleteStats[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('distance')
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? athletes.filter((a) => a.user.full_name.toLowerCase().includes(q))
      : athletes.slice()

    return list.sort((a, b) => {
      switch (sort) {
        case 'count':
          return b.count - a.count
        case 'pace':
          // Ascendente (più veloce prima); chi non ha passo va in coda.
          return (a.avgPaceSPerKm ?? Infinity) - (b.avgPaceSPerKm ?? Infinity)
        case 'recent':
          return lastActivityTs(b) - lastActivityTs(a)
        case 'distance':
        default:
          return b.totalDistanceM - a.totalDistanceM
      }
    })
  }, [athletes, query, sort])

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Barra di ricerca + ordinamento */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un atleta…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort" className="text-xs text-gray-400 hidden sm:block">
            Ordina per
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-gray-200 bg-gray-50 py-2.5 px-3 text-sm text-gray-700 focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
          <p className="text-sm text-gray-400">
            Nessun atleta trovato per “{query}”.
          </p>
        </div>
      ) : (
        filtered.map((at) => (
          <AthleteAccordion
            key={at.userId}
            athlete={at}
            isOpen={open.has(at.userId)}
            onToggle={() => toggle(at.userId)}
          />
        ))
      )}
    </div>
  )
}

function AthleteAccordion({
  athlete: at,
  isOpen,
  onToggle,
}: {
  athlete: AthleteStats
  isOpen: boolean
  onToggle: () => void
}) {
  const panelId = `athlete-panel-${at.userId}`
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Testata cliccabile */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <Avatar name={at.user.full_name} src={at.user.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{at.user.full_name}</p>
          <p className="text-xs text-gray-400">
            {at.count} {at.count === 1 ? 'allenamento' : 'allenamenti'}
            {' · '}
            {formatDistance(at.totalDistanceM)}
            {at.avgPaceSPerKm ? ` · ${formatPace(at.avgPaceSPerKm)}/km` : ''}
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* Pannello espandibile */}
      {isOpen && (
        <div id={panelId} className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: formatDistance(at.totalDistanceM), label: 'km totali', icon: 'footprint' },
              { value: at.avgPaceSPerKm ? `${formatPace(at.avgPaceSPerKm)}/km` : '—', label: 'passo medio', icon: 'speed' },
              { value: formatDistance(at.longestDistanceM), label: 'uscita più lunga', icon: 'trending_up' },
              { value: formatTime(at.totalMovingTimeS), label: 'tempo totale', icon: 'timer' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 bg-gray-50 rounded-2xl py-3 px-2 text-center">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-lg">{s.icon}</span>
                <span className="text-base font-extrabold text-gray-900 leading-none">{s.value}</span>
                <span className="text-[11px] text-gray-400 leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-2">
            <Link
              href={`/profilo/${at.userId}`}
              className="text-xs text-[var(--color-primary)] font-medium hover:underline inline-flex items-center gap-1"
            >
              Vedi profilo
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
            </Link>
          </div>

          {/* Elenco allenamenti dell'atleta */}
          <div className="mt-2 divide-y divide-gray-100">
            {at.activities.map((a) => {
              const elev = a.total_elevation_gain_m ? Math.round(a.total_elevation_gain_m) : 0
              return (
                <div key={a.id} className="flex items-center gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a
                        href={`https://www.strava.com/activities/${a.strava_activity_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 truncate hover:text-[#FC4C02] inline-flex items-center gap-1"
                      >
                        {a.name || 'Allenamento'}
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                      <span className="text-xs text-gray-400">· {relativeDay(a.start_date)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600">
                      {(a.distance_m ?? 0) > 0 && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-gray-400">footprint</span>
                          {formatDistance(a.distance_m ?? 0)}
                        </span>
                      )}
                      {a.avg_pace_s_per_km && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-gray-400">speed</span>
                          {formatPace(a.avg_pace_s_per_km)}/km
                        </span>
                      )}
                      {a.avg_heartrate_bpm && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-red-400">cardiology</span>
                          {Math.round(a.avg_heartrate_bpm)} bpm
                        </span>
                      )}
                      {elev > 0 && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-gray-400">altitude</span>
                          {elev} m
                        </span>
                      )}
                      {a.moving_time_s && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-gray-400">timer</span>
                          {formatTime(a.moving_time_s)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
