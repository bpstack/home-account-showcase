'use client'

import { cn } from '@/lib/utils'
import { useState, useRef, useEffect, SelectHTMLAttributes, forwardRef, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

interface FilterSelectProps {
  options: { value: string; label: string }[]
  /** Estilo visual como tabs (sin bordes, con subrayado) */
  variant?: 'default' | 'tab'
  /** Icono opcional para mostrar */
  icon?: ReactNode
  /** Valor seleccionado */
  value?: string
  /** Callback cuando cambia el valor */
  onChange?: (e: { target: { value: string } }) => void
  /** Clases adicionales */
  className?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            className={cn(
              'w-full h-11 px-4 pr-10 py-2 text-sm rounded-md border bg-background text-foreground appearance-none',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-destructive' : 'border-border',
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

// FilterSelect con dropdown personalizado para dark mode
function FilterSelect({
  options,
  variant = 'default',
  icon,
  value,
  onChange,
  className
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange({ target: { value: optionValue } })
    }
    setIsOpen(false)
  }

  if (variant === 'tab') {
    return (
      <div className="relative group ml-3 first:ml-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-1 py-3 px-1 text-sm font-medium',
            'bg-transparent border-0',
            'text-muted-foreground',
            'hover:text-foreground',
            'focus:outline-none focus:ring-0 focus:text-foreground',
            'transition-all duration-200 cursor-pointer',
            className
          )}
        >
          {icon && (
            <span className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors">
              {icon}
            </span>
          )}
          <span>{selectedOption?.label}</span>
          <ChevronDown className={cn(
            'h-3 w-3 text-muted-foreground group-hover:text-foreground transition-all duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1 min-w-[120px] max-h-[300px] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
            {options.map((option) => {
              const isSelected = value === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 ml-2" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Default variant - también usar dropdown personalizado
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-9 px-3 pr-8 text-sm rounded-md border border-border bg-background text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'flex items-center justify-between min-w-[100px]',
          className
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-full max-h-[300px] overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
          {options.map((option) => {
            const isSelected = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

Select.displayName = 'Select'
FilterSelect.displayName = 'FilterSelect'

export { Select, FilterSelect }
