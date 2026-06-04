import Link from 'next/link'
import { Run } from '@/lib/types'
import { formatDateShort, LEVEL_LABELS, cn } from '@/lib/utils'
import { Badge } from './ui/Badge'
import { Avatar } from './ui/Avatar'

interface RunCardProps {
  run: Run
  className?: string
}

export function RunCard({ run, className }: RunCardProps) {
  const isConfirmed = run.status === 'aperta' && (run.participants_count ?? 0) > 0
  const accentColor = isConfirmed ? 'bg-tertiary' : 'bg-primary'

  return (
    <Link href={`/corse/${run.id}`} className={cn('group block', className)}>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 h-full flex flex-col">
        <div className={cn('h-1', accentColor)} />
        <div className="p-5 flex flex-col flex-1 gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={run.level === 'tutti' ? 'default' : run.level === 'principiante' ? 'green' : 'orange'}>
                {LEVEL_LABELS[run.level]}
              </Badge>
              {run.is_no_drop && <Badge variant="green">No Drop</Badge>}
              {run.series_id && <Badge variant="muted">Serie</Badge>}
            </div>
            <span className="text-xs text-on-surface-variant shrink-0 font-medium">
              {formatDateShort(run.date)}
            </span>
          </div>

          <h3 className="text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
            {run.title}
          </h3>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-outline-variant/30">
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-primary text-lg">place</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Luogo</span>
              <span className="text-xs font-semibold text-on-surface text-center leading-tight">{run.city}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-primary text-lg">schedule</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Orario</span>
              <span className="text-xs font-semibold text-on-surface">{run.time.slice(0, 5)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="material-symbols-outlined text-primary text-lg">route</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Km</span>
              <span className="text-xs font-semibold text-on-surface">
                {run.distance_km ? `${run.distance_km} km` : '—'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <Avatar name={run.organizer.full_name} src={run.organizer.avatar_url} size="sm" />
              <div>
                <p className="text-xs font-semibold text-on-surface leading-tight">{run.organizer.full_name}</p>
                {run.organizer.city && (
                  <p className="text-[11px] text-on-surface-variant">{run.organizer.city}</p>
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
