import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold tracking-wider uppercase text-on-surface-variant">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-12 px-4 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
