'use client'

import { Button, FilterSelect, DatePicker, Tooltip } from '@/components/ui'
import { Calendar, CalendarDays, X } from 'lucide-react'
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
  className,
}: PageFiltersProps) {
  const currentYear = new Date().getFullYear()

  const monthOptions = [
    { value: 'none', label: '-' },
    { value: 'all', label: 'Todos' },
    ...MONTHS_ES.map((m, i) => ({ value: String(i), label: m })),
  ]

  const yearOptions = [
    { value: 'none', label: '-' },
    ...Array.from({ length: 5 }, (_, i) => {
      const y = currentYear - i
      return { value: String(y), label: String(y) }
    }),
  ]

  return (
    <div className={`flex items-center justify-between w-full ${className || ''}`}>
      {/* Filtros a la izquierda */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        {showMonthSelect && onMonthChange && (
          <FilterSelect
            variant="tab"
            options={monthOptions}
            value={
              selectedMonth === null
                ? year === null || year === undefined
                  ? 'none'
                  : 'all'
                : String(selectedMonth)
            }
            onChange={(e) => {
              if (e.target.value === 'none') {
                onMonthChange(null)
              } else {
                onMonthChange(e.target.value === 'all' ? null : parseInt(e.target.value))
              }
            }}
            icon={<Calendar className="h-3.5 w-3.5" />}
            title="Mes"
            label={
              selectedMonth !== null && selectedMonth !== undefined
                ? MONTHS_ES[selectedMonth]
                : undefined
            }
          />
        )}

        {showYearSelect && onYearChange && (
          <FilterSelect
            variant="tab"
            options={yearOptions}
            value={year === null || year === undefined ? 'none' : String(year)}
            onChange={(e) =>
              onYearChange(e.target.value === 'none' ? null : parseInt(e.target.value))
            }
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            title="Año"
            label={year !== null && year !== undefined ? String(year) : undefined}
          />
        )}

        {showDatePicker && (
          <div className="flex items-center gap-1">
            <DatePicker
              variant="tab"
              startDate={startDate}
              endDate={endDate}
              onDatesChange={onDatesChange}
              compact
            />
          </div>
        )}

        {showPeriodFilters && onPeriodChange && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant={period === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange('month')}
              className="h-6 px-2 text-xs"
            >
              Mes
            </Button>
            <Button
              variant={period === 'year' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange('year')}
              className="h-6 px-2 text-xs"
            >
              Año
            </Button>
            <Button
              variant={period === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onPeriodChange('all')}
              className="h-6 px-2 text-xs"
            >
              Todo
            </Button>
          </div>
        )}
      </div>

      {/* Botón X a la derecha */}
      {showClear && onClear && (
        <Tooltip content="Eliminar filtros">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="h-6 w-6 text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all rounded-full ml-2 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      )}
    </div>
  )
}
