import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-bold tracking-wider uppercase text-on-surface-variant">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'h-12 w-full px-4 pr-10 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all',
              error && 'border-error focus:ring-error',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xl">
            expand_more
          </span>
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
