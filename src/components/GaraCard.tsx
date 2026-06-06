import Link from 'next/link'
import type { Run } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'

const RACE_DISTANCE_LABELS: Record<string, string> = {
  '5k': '5K', '10k': '10K', '21k': 'Mezza', '42k': 'Maratona',
}

const LOOKING_FOR_LABELS: Record<string, { label: string; icon: string }> = {
  pacer:     { label: 'Pacer',          icon: 'speed' },
  compagno:  { label: 'Compagno',       icon: 'group' },
  supporter: { label: 'Supporter',      icon: 'volunteer_activism' },
}

export function GaraCard({ run }: { run: Run }) {
  const dist  = run.race_distance ? RACE_DISTANCE_LABELS[run.race_distance] ?? run.race_distance : null
  const lf    = run.looking_for ?? []

  return (
    <Link href={`/gare/${run.id}`} className="group block h-full">
      <article className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col">

        {/* Accent indigo */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-blue-500" />

        <div className="p-5 flex flex-col flex-1 gap-4">

          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {dist && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">emoji_events</span>
                  {dist}
                </span>
              )}
              {run.race_registered && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 px-2.5 py-0.5 text-xs font-semibold">
                  <span className="material-symbols-filled text-sm">check_circle</span>
                  Già iscritto
                </span>
              )}
            </div>
            <time className="shrink-0 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              {formatDate(run.date)}
            </time>
          </div>

          {/* Titolo */}
          <div>
            <h3 className="text-base font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
              {run.title}
            </h3>
            {run.race_name && (
              <p className="text-xs text-gray-400 mt-1 truncate">{run.race_name}</p>
            )}
          </div>

          {/* Data grid */}
          <div className="grid grid-cols-3 gap-2">
            <GaraPill icon="place"    label="Città"   value={run.city} />
            <GaraPill icon="schedule" label="Orario"  value={run.time.slice(0, 5)} />
            <GaraPill icon="timer"    label="Obiettivo" value={run.race_target_time || '—'} />
          </div>

          {/* Cosa cerca */}
          {lf.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lf.map(key => {
                const meta = LOOKING_FOR_LABELS[key]
                if (!meta) return null
                return (
                  <span key={key} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
                    <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                    Cerco {meta.label}
                  </span>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2.5">
              <Avatar name={run.organizer.full_name} src={run.organizer.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{run.organizer.full_name}</p>
                {run.organizer.city && (
                  <p className="text-[11px] text-gray-400 truncate">{run.organizer.city}</p>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all text-xl">
              arrow_forward
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function GaraPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-2xl py-2.5 px-2">
      <span className={cn('material-symbols-outlined text-base', 'text-indigo-500')}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{value}</span>
    </div>
  )
}
