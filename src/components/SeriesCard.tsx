import Link from 'next/link'
import { Series } from '@/lib/types'
import { LEVEL_LABELS, RECURRENCE_LABELS, DAY_LABELS, cn } from '@/lib/utils'
import { Badge } from './ui/Badge'
import { Avatar } from './ui/Avatar'

interface SeriesCardProps {
  series: Series
  className?: string
}

export function SeriesCard({ series, className }: SeriesCardProps) {
  return (
    <Link href={`/serie/${series.id}`} className={cn('group block', className)}>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        <div className="h-1 bg-tertiary" />
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="green">Serie</Badge>
              <Badge variant={series.level === 'tutti' ? 'default' : 'orange'}>
                {LEVEL_LABELS[series.level]}
              </Badge>
              {series.is_no_drop && <Badge variant="green">No Drop</Badge>}
            </div>
            <span className="text-xs text-tertiary font-bold shrink-0">
              {RECURRENCE_LABELS[series.recurrence_type]}
            </span>
          </div>

          <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
            {series.title}
          </h3>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-outline-variant/30">
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-tertiary text-lg">event_repeat</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Giorno</span>
              <span className="text-xs font-semibold text-on-surface text-center leading-tight">
                {DAY_LABELS[series.recurrence_day]}
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-tertiary text-lg">schedule</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Orario</span>
              <span className="text-xs font-semibold text-on-surface">{series.recurrence_time.slice(0, 5)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-tertiary text-lg">route</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Km</span>
              <span className="text-xs font-semibold text-on-surface">
                {series.distance_km ? `${series.distance_km} km` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <Avatar name={series.organizer.full_name} src={series.organizer.avatar_url} size="sm" />
              <div>
                <p className="text-xs font-semibold text-on-surface leading-tight">{series.organizer.full_name}</p>
                {series.organizer.city && (
                  <p className="text-[11px] text-on-surface-variant">{series.organizer.city}</p>
                )}
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
              arrow_forward
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
