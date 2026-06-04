'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-primary text-on-primary hover:opacity-90 shadow-lg shadow-primary/20': variant === 'primary',
            'border-2 border-outline bg-transparent text-on-surface hover:bg-surface-container': variant === 'secondary',
            'bg-transparent text-primary hover:bg-primary/5': variant === 'ghost',
            'bg-error text-on-error hover:opacity-90': variant === 'danger',
          },
          {
            'text-xs px-3 py-1.5': size === 'sm',
            'text-sm px-5 py-2.5': size === 'md',
            'text-base px-6 py-3': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
