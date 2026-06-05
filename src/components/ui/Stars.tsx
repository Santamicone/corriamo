'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const LABELS: Record<number, string> = {
  1: 'Esperienza negativa',
  2: 'Al di sotto delle aspettative',
  3: 'Nella norma',
  4: 'Buona corsa',
  5: 'Ottimo organizzatore',
}

interface StarsDisplayProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

/** Stelle di sola lettura */
export function StarsDisplay({ rating, size = 'md', showLabel = false, className }: StarsDisplayProps) {
  const sizeClass = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' }[size]
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={cn(
            sizeClass,
            n <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'
          )}
        >
          ★
        </span>
      ))}
      {showLabel && (
        <span className="ml-1 text-xs text-gray-500 font-medium">{LABELS[Math.round(rating)]}</span>
      )}
    </span>
  )
}

interface StarsInputProps {
  value: number
  onChange: (v: number) => void
  className?: string
}

/** Stelle interattive per input */
export function StarsInput({ value, onChange, className }: StarsInputProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className={cn(
              'text-3xl transition-all duration-100 hover:scale-110 focus:outline-none',
              n <= active ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'
            )}
            aria-label={`${n} stelle — ${LABELS[n]}`}
          >
            ★
          </button>
        ))}
      </div>
      {active > 0 && (
        <p className="text-sm font-medium text-gray-600 h-5 transition-all">
          {LABELS[active]}
        </p>
      )}
    </div>
  )
}

/** Badge compatto "★ 4.8 · 12 corse" */
export function RatingBadge({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count < 2) return null
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold text-amber-600', className)}>
      <span className="text-amber-400 text-base">★</span>
      {average.toFixed(1)}
      <span className="text-gray-400 font-normal">· {count} {count === 1 ? 'corsa' : 'corse'}</span>
    </span>
  )
}
