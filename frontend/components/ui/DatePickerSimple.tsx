'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerSimpleProps {
  value?: string
  onChange?: (date: string) => void
  className?: string
  placeholder?: string
}

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function DatePickerSimple({
  value,
  onChange,
  className,
  placeholder = 'Seleccionar fecha',
}: DatePickerSimpleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(value ? new Date(value).getMonth() : new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(value ? new Date(value).getFullYear() : new Date().getFullYear())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const today = new Date()

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

  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${parseInt(day)} de ${months[parseInt(month) - 1]}`
  }, [])

  const handleDateClick = useCallback(
    (day: number) => {
      const clickedDate = new Date(selectedYear, selectedMonth, day)
      const dateString = formatDate(clickedDate)

      if (onChange) {
        onChange(dateString)
      }
      setIsOpen(false)
    },
    [selectedYear, selectedMonth, formatDate, onChange]
  )

  const handleMonthChange = useCallback(
    (direction: 'prev' | 'next') => {
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
    },
    [selectedMonth, selectedYear]
  )

  const handleTodayClick = useCallback(() => {
    const todayDate = formatDate(today)
    if (onChange) {
      onChange(todayDate)
    }
    setSelectedMonth(today.getMonth())
    setSelectedYear(today.getFullYear())
    setIsOpen(false)
  }, [today, formatDate, onChange])

  const isDateSelected = useCallback(
    (day: number) => {
      if (!value) return false
      const currentDate = formatDate(new Date(selectedYear, selectedMonth, day))
      return currentDate === value
    },
    [value, selectedYear, selectedMonth, formatDate]
  )

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
  const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const displayValue = value ? formatDisplayDate(value) : placeholder

  return (
    <div ref={dropdownRef} className={cn('relative group', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 w-full h-11 px-4 py-2 text-sm',
          'bg-background border border-input rounded-md',
          'text-left justify-between',
          'hover:bg-accent/5 transition-all cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className={cn(!value && 'text-muted-foreground')}>{displayValue}</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 left-2 sm:left-auto mt-1 z-50 w-[calc(100vw-16px)] sm:w-72 bg-popover border border-border rounded-lg shadow-lg p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMonthChange('prev')}
                className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-foreground text-sm min-w-[100px] text-center">
                {months[selectedMonth]} {selectedYear}
              </span>
              <button
                type="button"
                onClick={() => handleMonthChange('next')}
                className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleTodayClick}
              className="px-2 py-1 text-xs font-medium bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'].map((day) => (
              <div
                key={day}
                className="text-center text-[10px] text-muted-foreground font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7" />
            ))}

            {days.map((day) => {
              const isSelected = isDateSelected(day)
              const isToday =
                day === today.getDate() &&
                selectedMonth === today.getMonth() &&
                selectedYear === today.getFullYear()

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    'h-7 rounded text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-accent text-white'
                      : isToday
                        ? 'bg-accent/10 text-accent'
                        : 'text-foreground hover:bg-muted'
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
