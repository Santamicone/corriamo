import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'green' | 'orange' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-widest uppercase',
      {
        'bg-secondary-container text-on-secondary-container': variant === 'default',
        'bg-tertiary/10 text-tertiary': variant === 'green',
        'bg-primary/10 text-primary': variant === 'orange',
        'bg-surface-container text-on-surface-variant': variant === 'muted',
      },
      className
    )}>
      {children}
    </span>
  )
}
