import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-bold tracking-wider uppercase text-on-surface-variant">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-on-surface-variant/60 resize-none',
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
Textarea.displayName = 'Textarea'
