'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Calendar, CalendarRange, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface DatePickerProps {
  startDate?: string
  endDate?: string
  onDatesChange?: (startDate: string, endDate: string) => void
  className?: string
  /** Modo compacto - solo muestra icono en el botón */
  compact?: boolean
  /** Estilo visual como tabs */
  variant?: 'default' | 'tab'
}

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function DatePicker({ startDate, endDate, onDatesChange, className, compact = false, variant = 'default' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [dateRange, setDateRange] = useState<{start?: string; end?: string}>({
    start: startDate,
    end: endDate
  })
  const dropdownRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }, [])

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }, [])

  const formatDate = useCallback((date: Date) => {
    return date.toISOString().split('T')[0]
  }, [])

  const handleDateClick = useCallback((day: number) => {
    const clickedDate = new Date(selectedYear, selectedMonth, day)
    const dateString = formatDate(clickedDate)
    
    if (!dateRange.start || dateRange.end) {
      // Si no hay fecha de inicio o ya hay ambas, empezar nuevo rango
      setDateRange({ start: dateString, end: undefined })
    } else {
      // Completar el rango
      const newRange = {
        start: dateString < dateRange.start ? dateString : dateRange.start,
        end: dateString < dateRange.start ? dateRange.start : dateString
      }
      setDateRange(newRange)
      
      if (onDatesChange) {
        onDatesChange(newRange.start!, newRange.end!)
      }
      setIsOpen(false)
    }
  }, [dateRange, selectedYear, selectedMonth, formatDate, onDatesChange])

  const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }, [selectedMonth, selectedYear])

  const handleTodayClick = useCallback(() => {
    setSelectedMonth(today.getMonth())
    setSelectedYear(today.getFullYear())
  }, [today])

  const isDateInRange = useCallback((day: number) => {
    if (!dateRange.start || !dateRange.end) return false
    
    const currentDate = formatDate(new Date(selectedYear, selectedMonth, day))
    return currentDate >= dateRange.start && currentDate <= dateRange.end
  }, [dateRange, selectedYear, selectedMonth, formatDate])

  const isDateSelected = useCallback((day: number) => {
    const currentDate = formatDate(new Date(selectedYear, selectedMonth, day))
    return currentDate === dateRange.start || currentDate === dateRange.end
  }, [dateRange, selectedYear, selectedMonth, formatDate])

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const displayText = dateRange.start && dateRange.end
    ? `${dateRange.start} - ${dateRange.end}`
    : 'Período'

  const shortDisplayText = dateRange.start && dateRange.end
    ? `${new Date(dateRange.start).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${new Date(dateRange.end).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
    : 'Período'

  if (variant === 'tab') {
    return (
      <div ref={dropdownRef} className="relative group ml-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-1 py-3 px-1 font-medium',
            'border-0 transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-0',
            isOpen
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground',
            className
          )}
          style={{ boxShadow: 'none', outline: 'none' }}
          title={displayText}
        >
          <CalendarRange className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline text-sm">{shortDisplayText}</span>
          <ChevronDown className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 z-50 w-80 bg-popover border border-border rounded-lg shadow-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMonthChange('prev')}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-foreground">
                  {months[selectedMonth]} {selectedYear}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMonthChange('next')}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTodayClick}
                className="h-8 px-3"
              >
                Hoy
              </Button>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}

              {days.map((day) => {
                const isInRange = isDateInRange(day)
                const isSelected = isDateSelected(day)
                const isToday =
                  day === today.getDate() &&
                  selectedMonth === today.getMonth() &&
                  selectedYear === today.getFullYear()

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      'h-8 rounded text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isInRange
                        ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400'
                        : isToday
                        ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Selection info */}
            <div className="mt-4 p-3 bg-muted rounded text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seleccionado:</span>
                <span className="font-medium text-foreground">
                  {dateRange.start && dateRange.end
                    ? `${dateRange.start} - ${dateRange.end}`
                    : 'Seleccione un rango'}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Días:</span>
                <span className="font-medium text-foreground">
                  {dateRange.start && dateRange.end
                    ? Math.ceil(
                        (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
                        (1000 * 60 * 60 * 24)
                      ) + 1
                    : 0
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 border border-border bg-background',
          isOpen && 'border-ring',
          compact ? 'h-9 w-9' : '',
          className
        )}
        title={compact ? displayText : undefined}
      >
        <CalendarRange className="h-4 w-4 flex-shrink-0" />
        {!compact && <span className="truncate">{displayText}</span>}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 w-80 bg-popover border border-border rounded-lg shadow-lg p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('prev')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-foreground">
                {months[selectedMonth]} {selectedYear}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMonthChange('next')}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTodayClick}
              className="h-8 px-3"
            >
              Hoy
            </Button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {days.map((day) => {
              const isInRange = isDateInRange(day)
              const isSelected = isDateSelected(day)
              const isToday =
                day === today.getDate() &&
                selectedMonth === today.getMonth() &&
                selectedYear === today.getFullYear()

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'h-8 rounded text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isInRange
                      ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400'
                      : isToday
                      ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Selection info */}
          <div className="mt-4 p-3 bg-muted rounded text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seleccionado:</span>
              <span className="font-medium text-foreground">
                {dateRange.start && dateRange.end
                  ? `${dateRange.start} - ${dateRange.end}`
                  : 'Seleccione un rango'}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-muted-foreground">Días:</span>
              <span className="font-medium text-foreground">
                {dateRange.start && dateRange.end
                  ? Math.ceil(
                      (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) /
                      (1000 * 60 * 60 * 24)
                    ) + 1
                  : 0
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}