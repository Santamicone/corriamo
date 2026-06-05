import { cn } from '@/lib/utils'

/* ── Preset icons: colori e label ── */
export const PRESET_OPTIONS = [
  { id: 'preset:1', bg: 'bg-primary',          label: 'Arancio' },
  { id: 'preset:2', bg: 'bg-tertiary',          label: 'Verde' },
  { id: 'preset:3', bg: 'bg-[#2563EB]',         label: 'Blu' },
] as const

function getPresetBg(src: string): string {
  return PRESET_OPTIONS.find(p => p.id === src)?.bg ?? 'bg-primary'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getColorClass(name: string) {
  const colors = ['bg-primary/20 text-primary', 'bg-tertiary/20 text-tertiary', 'bg-blue-100 text-blue-700']
  return colors[name.charCodeAt(0) % colors.length]
}

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  }

  const iconSizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl', xl: 'text-4xl' }
  const isPreset = src?.startsWith('preset:')
  const isUrl    = src && !isPreset

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden border-2 border-white',
      sizeClasses[size],
      isPreset ? getPresetBg(src!) : (!isUrl && getColorClass(name)),
      className
    )}>
      {isUrl ? (
        <img src={src!} alt={name} className="w-full h-full object-cover" />
      ) : isPreset ? (
        <span className={cn('material-symbols-filled text-white select-none', iconSizes[size])}>
          directions_run
        </span>
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
