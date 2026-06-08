import { cn } from '@/lib/utils'
import { getReliabilityBadge } from '@/lib/reliability'
import type { Profile } from '@/lib/types'

interface ReliabilityBadgeProps {
  profile: Pick<Profile, 'reliability_score' | 'reliability_eligible' | 'reliability_confirmed'>
  /** 'full' mostra etichetta + icona, 'icon' solo icona (per card compatta) */
  variant?: 'full' | 'icon'
  className?: string
}

export function ReliabilityBadge({ profile, variant = 'full', className }: ReliabilityBadgeProps) {
  const badge = getReliabilityBadge(profile)

  if (!badge) return null

  if (badge === 'affidabile') {
    return (
      <span
        title="Organizzatore affidabile — le sue corse si svolgono regolarmente"
        className={cn(
          'inline-flex items-center gap-1 rounded-full font-semibold',
          variant === 'full'
            ? 'bg-green-100 text-green-700 px-2.5 py-0.5 text-xs'
            : 'bg-green-100 text-green-700 px-1.5 py-0.5 text-[11px]',
          className,
        )}
      >
        <span className="material-symbols-filled text-sm">verified</span>
        {variant === 'full' && 'Affidabile'}
      </span>
    )
  }

  // badge === 'organizzatore'
  return (
    <span
      title="Ha già organizzato corse che si sono svolte"
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        variant === 'full'
          ? 'bg-blue-50 text-blue-600 px-2.5 py-0.5 text-xs'
          : 'bg-blue-50 text-blue-600 px-1.5 py-0.5 text-[11px]',
        className,
      )}
    >
      <span className="material-symbols-outlined text-sm">directions_run</span>
      {variant === 'full' && 'Organizzatore'}
    </span>
  )
}
