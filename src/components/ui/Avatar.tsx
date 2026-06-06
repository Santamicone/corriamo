import { cn } from '@/lib/utils'

/* ── Preset colorati (icona running) ── */
export const COLOR_PRESETS = [
  { id: 'preset:1', bg: 'bg-primary',    label: 'Arancio' },
  { id: 'preset:2', bg: 'bg-tertiary',   label: 'Verde' },
  { id: 'preset:3', bg: 'bg-[#2563EB]',  label: 'Blu' },
  { id: 'preset:4', bg: 'bg-[#7C3AED]',  label: 'Viola' },
  { id: 'preset:5', bg: 'bg-[#DB2777]',  label: 'Rosa' },
  { id: 'preset:6', bg: 'bg-[#0F766E]',  label: 'Teal' },
] as const

/* ── Personaggi illustrati ── */
export const CHARACTER_PRESETS = Array.from({ length: 9 }, (_, i) => ({
  id: `carattere:${i + 1}`,
  src: `/caratteri/carattere${i + 1}.png`,
  label: `Personaggio ${i + 1}`,
}))

/** Tutti i preset uniti — usato nella form di modifica */
export const PRESET_OPTIONS = [
  ...CHARACTER_PRESETS,
  ...COLOR_PRESETS,
]

function getColorBg(src: string): string {
  return COLOR_PRESETS.find(p => p.id === src)?.bg ?? 'bg-primary'
}

function getCharacterSrc(src: string): string {
  // 'carattere:3' → '/caratteri/carattere3.png'
  const n = src.split(':')[1]
  return `/caratteri/carattere${n}.png`
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

  const isPreset     = src?.startsWith('preset:')
  const isCharacter  = src?.startsWith('carattere:')
  const isUrl        = src && !isPreset && !isCharacter

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden border-2 border-white',
      sizeClasses[size],
      isPreset    ? getColorBg(src!) : '',
      isCharacter ? 'bg-gray-100'    : '',
      (!isPreset && !isCharacter && !isUrl) ? getColorClass(name) : '',
      className
    )}>
      {isUrl ? (
        <img src={src!} alt={name} className="w-full h-full object-cover" />
      ) : isCharacter ? (
        <img src={getCharacterSrc(src!)} alt={name} className="w-full h-full object-cover" />
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
