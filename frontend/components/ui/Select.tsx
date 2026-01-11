import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-text-primary mb-1"
          >
            {label}
          </label>
        )}
        <select
          id={id}
          className={cn(
            'w-full h-11 px-4 py-2 text-sm rounded-md border bg-layer-1 text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-danger' : 'border-layer-3',
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-danger">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }
