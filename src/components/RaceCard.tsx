import Link from 'next/link'
import type { Race } from '@/lib/types'
import { formatDateShort } from '@/lib/utils'

const DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
  trail: 'Trail', ultra: 'Ultra', other: 'Altro',
}

const CIRCUIT_LABELS: Record<string, { label: string; className: string }> = {
  major:      { label: 'Major',      className: 'bg-amber-100 text-amber-800 border border-amber-200' },
  superhalfs: { label: 'SuperHalf',  className: 'bg-violet-100 text-violet-800 border border-violet-200' },
  wa_label:   { label: 'WA Label',   className: 'bg-sky-100 text-sky-800 border border-sky-200' },
}

// ISO-2 → { nome italiano, bandiera }. Best-effort per i paesi del catalogo.
const COUNTRIES: Record<string, { name: string; flag: string }> = {
  IT: { name: 'Italia', flag: '🇮🇹' }, DE: { name: 'Germania', flag: '🇩🇪' },
  FR: { name: 'Francia', flag: '🇫🇷' }, ES: { name: 'Spagna', flag: '🇪🇸' },
  GB: { name: 'Regno Unito', flag: '🇬🇧' }, PT: { name: 'Portogallo', flag: '🇵🇹' },
  NL: { name: 'Paesi Bassi', flag: '🇳🇱' }, CH: { name: 'Svizzera', flag: '🇨🇭' },
  AT: { name: 'Austria', flag: '🇦🇹' }, BE: { name: 'Belgio', flag: '🇧🇪' },
  DK: { name: 'Danimarca', flag: '🇩🇰' }, SE: { name: 'Svezia', flag: '🇸🇪' },
  NO: { name: 'Norvegia', flag: '🇳🇴' }, FI: { name: 'Finlandia', flag: '🇫🇮' },
  IE: { name: 'Irlanda', flag: '🇮🇪' }, PL: { name: 'Polonia', flag: '🇵🇱' },
  CZ: { name: 'Rep. Ceca', flag: '🇨🇿' }, HU: { name: 'Ungheria', flag: '🇭🇺' },
  GR: { name: 'Grecia', flag: '🇬🇷' }, HR: { name: 'Croazia', flag: '🇭🇷' },
  RU: { name: 'Russia', flag: '🇷🇺' }, US: { name: 'USA', flag: '🇺🇸' },
  JP: { name: 'Giappone', flag: '🇯🇵' }, AU: { name: 'Australia', flag: '🇦🇺' },
}

export function countryLabel(iso: string): { name: string; flag: string } {
  return COUNTRIES[iso] ?? { name: iso, flag: '🏳️' }
}

export function RaceCard({ race }: { race: Race }) {
  const country = countryLabel(race.country)
  const circuit = race.circuit ? CIRCUIT_LABELS[race.circuit] : null
  const dateLabel = race.end_date
    ? `${formatDateShort(race.event_date)} – ${formatDateShort(race.end_date)}`
    : formatDateShort(race.event_date)

  return (
    <Link href={`/calendario-gare/${race.slug}`} className="group block h-full">
      <article className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />

        <div className="p-5 flex flex-col flex-1 gap-3">
          {/* Distanze + circuito */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {race.distances.map(d => (
                <span key={d} className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                  {DISTANCE_LABELS[d] ?? d}
                </span>
              ))}
            </div>
            {circuit && (
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${circuit.className}`}>
                <span className="material-symbols-outlined text-sm">star</span>
                {circuit.label}
              </span>
            )}
          </div>

          {/* Nome */}
          <h3 className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
            {race.name}
          </h3>

          {/* Luogo + data */}
          <div className="flex flex-col gap-1.5 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-indigo-500">place</span>
              {race.city}
              <span className="text-gray-300">·</span>
              <span>{country.flag} {country.name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-indigo-500">event</span>
              <span className="capitalize">{dateLabel}</span>
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <span className="text-xs font-medium text-gray-400">
              {race.source === 'aims' ? 'Fonte AIMS' : race.circuit ? 'Circuito internazionale' : 'Scheda gara'}
            </span>
            <span className="material-symbols-outlined text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all text-xl">
              arrow_forward
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
