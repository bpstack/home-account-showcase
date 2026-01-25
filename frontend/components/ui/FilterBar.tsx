'use client'

import { useFiltersStore } from '@/stores/filtersStore'
import { FilterSelect } from './Select'
import { DatePicker } from './DatePicker'
import { Calendar } from 'lucide-react'

interface FilterBarProps {
  /** Incluir selector de año */
  showYearFilter?: boolean
  /** Incluir selector de mes */
  showMonthFilter?: boolean
  /** Incluir selector de período personalizado */
  showDatePicker?: boolean
  /** Callback cuando se selecciona un DatePicker */
  onDateRangeChange?: (startDate: string, endDate: string) => void
  /** Clases adicionales */
  className?: string
}

export function FilterBar({ 
  showYearFilter = true, 
  showMonthFilter = true, 
  showDatePicker = false,
  onDateRangeChange,
  className 
}: FilterBarProps) {
  const {
    selectedYear,
    selectedMonth,
    setYear,
    setMonth,
  } = useFiltersStore()

  const currentYear = new Date().getFullYear()
  const monthOptions = [
    { value: '', label: 'Todos' },
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' },
  ]

  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const year = currentYear - i
    return { value: String(year), label: String(year) }
  })

  const handleDatesChange = (startDate: string, endDate: string) => {
    // Cuando se usa DatePicker, limpiamos mes y año seleccionados
    setMonth(null)
    
    // Llamar al callback si existe
    if (onDateRangeChange) {
      onDateRangeChange(startDate, endDate)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {/* Filtro de Mes */}
      {showMonthFilter && (
        <FilterSelect
          variant="tab"
          options={monthOptions}
          value={selectedMonth !== null ? String(selectedMonth) : ''}
          onChange={(e) => {
            const value = e.target.value
            setMonth(value === '' ? null : parseInt(value, 10))
          }}
          icon={<Calendar className="h-4 w-4" />}
        />
      )}

      {/* Filtro de Año */}
      {showYearFilter && (
        <FilterSelect
          variant="tab"
          options={yearOptions}
          value={String(selectedYear)}
          onChange={(e) => setYear(parseInt(e.target.value, 10))}
        />
      )}

      {/* DatePicker para rango personalizado */}
      {showDatePicker && (
        <DatePicker
          variant="tab"
          onDatesChange={handleDatesChange}
        />
      )}
    </div>
  )
}