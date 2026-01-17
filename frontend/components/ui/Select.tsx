import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

interface FilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            className={cn(
              'w-full h-11 px-4 pr-10 py-2 text-sm rounded-md border bg-layer-1 text-text-primary appearance-none',
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

const FilterSelect = forwardRef<HTMLSelectElement, FilterSelectProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            'h-9 px-3 pr-8 text-sm rounded-md border border-layer-3 bg-layer-1 text-text-primary appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
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
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
      </div>
    )
  }
)

Select.displayName = 'Select'
FilterSelect.displayName = 'FilterSelect'

export { Select, FilterSelect }
