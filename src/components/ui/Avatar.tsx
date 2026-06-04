import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

function getColorClass(name: string) {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-tertiary/20 text-tertiary',
    'bg-secondary/20 text-secondary',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden border-2 border-surface-container-lowest',
      sizeClasses[size],
      !src && getColorClass(name),
      className
    )}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}
