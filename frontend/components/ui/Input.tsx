import { cn } from '@/lib/utils'
import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Control shown inside the field, on the right (e.g. the show-password button). */
  trailing?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, trailing, id, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined
    const describedBy = [errorId, props['aria-describedby']].filter(Boolean).join(' ') || undefined

    const input = (
      <input
        id={id}
        className={cn(
          'w-full h-10 px-3 py-2 text-sm rounded-md border bg-layer-1 text-text-primary placeholder:text-text-secondary',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-danger' : 'border-layer-3',
          trailing && 'pr-11',
          className
        )}
        ref={ref}
        {...props}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
      />
    )

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        {trailing ? (
          <div className="relative">
            {input}
            <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>
          </div>
        ) : (
          input
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
