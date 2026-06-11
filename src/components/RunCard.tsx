import Link from 'next/link'
import { Run } from '@/lib/types'
import { formatDate, LEVEL_LABELS, formatPaceTarget, cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'
import { TagBadgeList } from './ui/TagBadge'
import type { CompatibilityResult } from '@/lib/compatibility'

type RunWithMeta = Run & {
  is_spot?: boolean
  has_momento?: boolean
  compatibility?: CompatibilityResult
  interests_count?: number
  my_interest?: boolean
  location_public?: boolean
}

interface RunCardProps {
  run: Run
  className?: string
}

const LEVEL_COLORS: Record<string, { badge: string }> = {
  tutti:        { badge: 'bg-gray-100 text-gray-600' },
  principiante: { badge: 'bg-green-100 text-green-700' },
  intermedio:   { badge: 'bg-blue-100 text-blue-700' },
  avanzato:     { badge: 'bg-orange-100 text-orange-700' },
}

export function RunCard({ run, className }: RunCardProps) {
  const lc = LEVEL_COLORS[run.level] ?? LEVEL_COLORS.tutti
  const count = run.participants_count ?? 0
  const r = run as RunWithMeta
  const isSpot         = r.is_spot === true
  const hasMomento     = r.has_momento === true
  const compat         = r.compatibility ?? null
  const hasMomenti     = (run as Run & { momenti_count?: number }).momenti_count ?? 0
  const interestsCount = r.interests_count ?? 0
  const isPrivateLoc   = r.location_public === false
  // Accent: rosso pulsante per spot, verde se partecipanti, arancio default
  const accentClass = isSpot
    ? 'from-red-500 to-orange-500'
    : count > 0
      ? 'from-green-500 to-emerald-400'
      : 'from-orange-500 to-orange-400'

  return (
    <Link href={`/corse/${run.id}`} className={cn('group block h-full', className)}>
      <article className="h-full bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/40 transition-all duration-200 hover:-translate-y-1 overflow-hidden flex flex-col">

        {/* Accent gradient top */}
        <div className={cn('h-1 bg-gradient-to-r', accentClass)} />

        {/* Banner compatibilità */}
        {compat && (
          <div className={cn(
            'px-4 py-1.5 flex items-center gap-1.5 text-[11px] font-bold border-b',
            compat.score >= 88
              ? 'bg-orange-50 text-orange-700 border-orange-100'
              : compat.score >= 72
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-gray-50 text-gray-600 border-gray-100'
          )}>
            <span className="material-symbols-filled text-sm">auto_awesome</span>
            {compat.score}%&nbsp;·&nbsp;{compat.label}
          </div>
        )}

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
              {isSpot && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Adesso
                </span>
              )}
                {hasMomenti > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  {hasMomenti}
                </span>
              )}
              {hasMomento && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-semibold text-orange-600">
                  <span className="material-symbols-filled text-sm">photo_camera</span>
                  Momento
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
            <DataPill
              icon={isPrivateLoc ? 'lock' : 'place'}
              label="Luogo"
              value={isPrivateLoc ? run.city : (run.location || run.city)}
              muted={isPrivateLoc}
            />
            <DataPill icon="schedule" label="Orario" value={run.time.slice(0, 5)} />
            <DataPill icon="route"    label="Km"     value={run.distance_km ? `${run.distance_km} km` : '—'} />
          </div>
          {isPrivateLoc && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 -mt-1">
              <span className="material-symbols-outlined text-sm text-gray-300">lock</span>
              Luogo riservato ai partecipanti
            </div>
          )}

          {run.pace_target && (
            <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-primary text-base">speed</span>
              <span className="text-xs font-semibold text-orange-800">{formatPaceTarget(run.pace_target)}</span>
            </div>
          )}
          {/* Tag caratteristiche */}
          {(r as RunWithMeta & { tags?: string[] }).tags?.length ? (
            <TagBadgeList tags={(r as RunWithMeta & { tags?: string[] }).tags!} max={3} />
          ) : null}

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
              {interestsCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-500">
                  <span className="material-symbols-filled text-base">star</span>
                  {interestsCount}
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

function DataPill({ icon, label, value, muted }: { icon: string; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-gray-50 rounded-2xl py-2.5 px-2">
      <span className={cn('material-symbols-outlined text-base', muted ? 'text-gray-400' : 'text-primary')}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
      <span className={cn('text-xs font-bold text-center leading-tight', muted ? 'text-gray-400' : 'text-gray-700')}>{value}</span>
    </div>
  )
}
