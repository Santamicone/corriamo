import Link from 'next/link'
import { Run } from '@/lib/types'
import { formatDate, LEVEL_LABELS, cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'

interface RunCardProps {
  run: Run
  className?: string
}

const LEVEL_COLORS: Record<string, { badge: string; accent: string }> = {
  tutti:         { badge: 'bg-gray-100 text-gray-600',   accent: 'from-gray-400 to-gray-300' },
  principiante:  { badge: 'bg-green-100 text-green-700', accent: 'from-green-500 to-green-400' },
  intermedio:    { badge: 'bg-blue-100 text-blue-700',   accent: 'from-blue-500 to-blue-400' },
  avanzato:      { badge: 'bg-orange-100 text-orange-700', accent: 'from-orange-500 to-orange-400' },
}

export function RunCard({ run, className }: RunCardProps) {
  const lc = LEVEL_COLORS[run.level] ?? LEVEL_COLORS.tutti
  const count = run.participants_count ?? 0

  return (
    <Link href={`/corse/${run.id}`} className={cn('group block h-full', className)}>
      <article className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col">

        {/* Accent gradient top */}
        <div className={cn('h-1 bg-gradient-to-r', lc.accent)} />

        <div className="p-5 flex flex-col flex-1 gap-4">

          {/* Header row: badge + data */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', lc.badge)}>
                {LEVEL_LABELS[run.level]}
              </span>
              {run.is_no_drop && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  <span className="material-symbols-filled text-sm">favorite</span>
                  No drop
                </span>
              )}
              {run.series_id && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                  <span className="material-symbols-outlined text-sm">event_repeat</span>
                  Ricorrente
                </span>
              )}
            </div>
            <time className="shrink-0 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              {formatDate(run.date)}
            </time>
          </div>

          {/* Title */}
          <h3 className="text-base font-extrabold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {run.title}
          </h3>

          {/* Data grid */}
          <div className="grid grid-cols-3 gap-2">
            <DataPill icon="place"    label="Luogo"  value={run.city} />
            <DataPill icon="schedule" label="Orario" value={run.time.slice(0, 5)} />
            <DataPill icon="route"    label="Km"     value={run.distance_km ? `${run.distance_km} km` : '—'} />
          </div>

          {run.pace_target && (
            <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-primary text-base">speed</span>
              <span className="text-xs font-semibold text-orange-800">{run.pace_target}</span>
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
            <div className="flex items-center gap-2">
              {count > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-base">group</span>
                  {count}
                </span>
              )}
              <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all text-xl">
                arrow_forward
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function DataPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-2xl py-2.5 px-2">
      <span className="material-symbols-outlined text-primary text-base">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{value}</span>
    </div>
  )
}
