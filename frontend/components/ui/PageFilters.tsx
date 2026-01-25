'use client'

import { Button, FilterSelect, DatePicker, Tooltip } from '@/components/ui'
import { Calendar, X } from 'lucide-react'
import { MONTHS_ES } from '@/lib/constants'

interface PageFiltersProps {
  // Period filters (Month/Year/etc) - Used in Balance/Dashboard if needed
  showPeriodFilters?: boolean
  period?: 'month' | 'year' | 'all' | 'custom'
  onPeriodChange?: (period: 'month' | 'year' | 'all' | 'custom') => void
  
  // Year navigation/select
  showYearSelect?: boolean
  year?: number | null
  onYearChange?: (year: number | null) => void

  
  // Date range
  showDatePicker?: boolean
  startDate?: string
  endDate?: string
  onDatesChange?: (start: string, end: string) => void

  // Month select
  showMonthSelect?: boolean
  selectedMonth?: number | null
  onMonthChange?: (month: number | null) => void

  // Clear filters action
  showClear?: boolean
  onClear?: () => void

  className?: string
}

export function PageFilters({
  showPeriodFilters,
  period,
  onPeriodChange,
  showYearSelect,
  year,
  onYearChange,
  showDatePicker,
  startDate,
  endDate,
  onDatesChange,
  showMonthSelect,
  selectedMonth,
  onMonthChange,
  showClear,
  onClear,
  className
}: PageFiltersProps) {
  const currentYear = new Date().getFullYear()

  const monthOptions = [
    { value: 'none', label: '-' },
    { value: 'all', label: 'Todos' },
    ...MONTHS_ES.map((m, i) => ({ value: String(i), label: m }))
  ]

  const yearOptions = [
    { value: 'none', label: '-' },
    ...Array.from({ length: 11 }, (_, i) => {
      const y = currentYear - i
      return { value: String(y), label: String(y) }
    })
  ]


  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 ${className || ''}`}>

      {showPeriodFilters && onPeriodChange && (
        <div className="flex items-center gap-1 mr-1">
          <Button
            variant={period === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onPeriodChange('month')}
            className="h-8 px-3"
          >
            Mes
          </Button>
          <Button
            variant={period === 'year' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onPeriodChange('year')}
            className="h-8 px-3"
          >
            Año
          </Button>
          <Button
            variant={period === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onPeriodChange('all')}
            className="h-8 px-3"
          >
            Todo
          </Button>
        </div>
      )}

      {showMonthSelect && onMonthChange && (
        <FilterSelect
          variant="tab"
          options={monthOptions}
          value={selectedMonth === null ? (
            // Si el año es null (estamos en modo periodo), mostramos '-'
            year === null || year === undefined ? 'none' : 'all'
          ) : String(selectedMonth)}
          onChange={(e) => {
            if (e.target.value === 'none') {
              // Si selecciona '-', forzar null tanto en mes como en año? 
              // En realidad el '-' es un estado pasivo cuando se usa periodo
              onMonthChange(null)
            } else {
              onMonthChange(e.target.value === 'all' ? null : parseInt(e.target.value))
            }
          }}
          icon={<Calendar className="h-4 w-4" />}
          className="w-32"
        />
      )}


      {showYearSelect && onYearChange && (
        <FilterSelect
          variant="tab"
          options={yearOptions}
          value={year === null || year === undefined ? 'none' : String(year)}
          onChange={(e) => onYearChange(e.target.value === 'none' ? null : parseInt(e.target.value))}
          className="w-24"
        />
      )}


      {showDatePicker && (
        <DatePicker
          variant="tab"
          startDate={startDate}
          endDate={endDate}
          onDatesChange={onDatesChange}
        />
      )}

      {showClear && onClear && (
        <Tooltip content="Eliminar filtros">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-8 w-8 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </Tooltip>
      )}
    </div>
  )
}
