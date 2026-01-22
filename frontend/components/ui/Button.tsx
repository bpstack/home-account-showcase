import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  isLoading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'default', isLoading, children, disabled, ...props },
    ref
  ) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600': variant === 'default',
            'bg-muted text-foreground hover:bg-muted/80': variant === 'secondary',
            'hover:bg-muted text-foreground': variant === 'ghost',
            'border border-border bg-transparent hover:bg-muted text-foreground':
              variant === 'outline',
            'bg-destructive text-white hover:bg-destructive/90': variant === 'danger',
          },
          {
            'h-10 px-4 py-2 text-sm': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
            'h-12 px-6 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
