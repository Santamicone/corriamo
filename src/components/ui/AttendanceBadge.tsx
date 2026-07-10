import { cn } from '@/lib/utils'
import { getAttendanceBadge } from '@/lib/reliability'
import type { Profile } from '@/lib/types'

interface AttendanceBadgeProps {
  profile: Pick<Profile, 'attendance_score' | 'attendance_eligible' | 'attendance_confirmed'>
  variant?: 'full' | 'icon'
  className?: string
}

/** Badge "si presenta" / "sempre presente" — affidabilità come partecipante. */
export function AttendanceBadge({ profile, variant = 'full', className }: AttendanceBadgeProps) {
  const badge = getAttendanceBadge(profile)
  if (!badge) return null

  if (badge === 'sempre_presente') {
    return (
      <span
        title="Si presenta sempre alle corse a cui si iscrive"
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold',
          variant === 'full'
            ? 'bg-teal-100 text-teal-700 px-2.5 py-0.5 text-xs'
            : 'bg-teal-100 text-teal-700 px-1.5 py-0.5 text-[11px]',
          className,
        )}
      >
        <span className="material-symbols-filled text-sm">where_to_vote</span>
        {variant === 'full' && 'Sempre presente'}
      </span>
    )
  }

  // badge === 'si_presenta'
  return (
    <span
      title="Ha già confermato la presenza a corse a cui ha partecipato"
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        variant === 'full'
          ? 'bg-teal-50 text-teal-600 px-2.5 py-0.5 text-xs'
          : 'bg-teal-50 text-teal-600 px-1.5 py-0.5 text-[11px]',
        className,
      )}
    >
      <span className="material-symbols-outlined text-sm">check_circle</span>
      {variant === 'full' && 'Si presenta'}
    </span>
  )
}
