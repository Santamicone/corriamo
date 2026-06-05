import Link from 'next/link'
import { Series } from '@/lib/types'
import { LEVEL_LABELS, RECURRENCE_LABELS, DAY_LABELS, cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'

interface SeriesCardProps {
  series: Series
  className?: string
}

export function SeriesCard({ series, className }: SeriesCardProps) {
  return (
    <Link href={`/serie/${series.id}`} className={cn('group block h-full', className)}>
      <article className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-green-100/40 transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col">

        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400" />

        <div className="p-5 flex flex-col flex-1 gap-4">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                <span className="material-symbols-outlined text-sm">event_repeat</span>
                Serie
              </span>
              {series.is_no_drop && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  <span className="material-symbols-filled text-sm">favorite</span>
                  No drop
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
              {RECURRENCE_LABELS[series.recurrence_type]}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-extrabold text-gray-900 group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {series.title}
          </h3>

          {/* Data grid */}
          <div className="grid grid-cols-3 gap-2">
            <DataPill icon="calendar_today" label="Giorno"  value={DAY_LABELS[series.recurrence_day]} color="text-green-600" />
            <DataPill icon="schedule"       label="Orario"  value={series.recurrence_time.slice(0, 5)} color="text-green-600" />
            <DataPill icon="route"          label="Km"      value={series.distance_km ? `${series.distance_km} km` : '—'} color="text-green-600" />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2.5">
              <Avatar name={series.organizer.full_name} src={series.organizer.avatar_url} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700 leading-tight truncate">{series.organizer.full_name}</p>
                {series.organizer.city && <p className="text-[11px] text-gray-400 truncate">{series.organizer.city}</p>}
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all text-xl">
              arrow_forward
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

function DataPill({ icon, label, value, color = 'text-primary' }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-2xl py-2.5 px-2">
      <span className={cn('material-symbols-outlined text-base', color)}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-xs font-bold text-gray-700 text-center leading-tight">{value}</span>
    </div>
  )
}
