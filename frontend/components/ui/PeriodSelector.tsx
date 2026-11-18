'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MONTHS_ES } from '@/lib/constants'
import { canShift, periodLabel, periodRange, shiftPeriod, type Period } from '@/lib/period'

interface PeriodSelectorProps {
  value: Period
  onChange: (_period: Period) => void
  className?: string
}

const arrowClass =
  'flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-layer-2 hover:text-text-primary disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const optionClass =
  'rounded-md px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * One control for the period a page shows: arrows move a month (or a year) back and forward;
 * the label opens a panel to pick a month, a whole year, everything, or two dates.
 */
export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(
    value.kind === 'month' || value.kind === 'year' ? value.year : new Date().getFullYear()
  )
  const [showDates, setShowDates] = useState(value.kind === 'range')
  const [dates, setDates] = useState(periodRange(value))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) {
      // Start the panel on the period being shown
      setViewYear(
        value.kind === 'month' || value.kind === 'year' ? value.year : new Date().getFullYear()
      )
      setShowDates(value.kind === 'range')
      setDates(periodRange(value))
    }
    setOpen(!open)
  }

  const choose = (period: Period) => {
    onChange(period)
    setOpen(false)
  }

  const unit = value.kind === 'year' ? 'Año' : 'Mes'
  const shiftable = canShift(value)
  const datesValid = dates.start !== '' && dates.end !== '' && dates.start <= dates.end

  return (
    <div ref={rootRef} className={cn('relative flex items-center', className)}>
      <button
        type="button"
        className={arrowClass}
        onClick={() => onChange(shiftPeriod(value, -1))}
        disabled={!shiftable}
        aria-label={`${unit} anterior`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-text-primary hover:bg-layer-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {periodLabel(value)}
        <ChevronDown className="h-4 w-4 text-text-secondary" aria-hidden="true" />
      </button>

      <button
        type="button"
        className={arrowClass}
        onClick={() => onChange(shiftPeriod(value, 1))}
        disabled={!shiftable}
        aria-label={`${unit} siguiente`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir periodo"
          className="absolute left-0 top-full z-40 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-layer-3 bg-layer-1 p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className={arrowClass}
              onClick={() => setViewYear(viewYear - 1)}
              aria-label="Año anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-text-primary">{viewYear}</span>
            <button
              type="button"
              className={arrowClass}
              onClick={() => setViewYear(viewYear + 1)}
              aria-label="Año siguiente"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {MONTHS_ES.map((name, month) => {
              const selected =
                value.kind === 'month' && value.year === viewYear && value.month === month
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => choose({ kind: 'month', year: viewYear, month })}
                  aria-pressed={selected}
                  aria-label={`${name} ${viewYear}`}
                  className={cn(
                    optionClass,
                    selected
                      ? 'bg-accent text-accent-foreground'
                      : 'text-text-primary hover:bg-layer-2'
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1 border-t border-layer-3 pt-2">
            <button
              type="button"
              onClick={() => choose({ kind: 'year', year: viewYear })}
              aria-pressed={value.kind === 'year' && value.year === viewYear}
              className={cn(
                optionClass,
                value.kind === 'year' && value.year === viewYear
                  ? 'bg-accent text-accent-foreground'
                  : 'text-text-primary hover:bg-layer-2'
              )}
            >
              Todo {viewYear}
            </button>
            <button
              type="button"
              onClick={() => choose({ kind: 'all' })}
              aria-pressed={value.kind === 'all'}
              className={cn(
                optionClass,
                value.kind === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-text-primary hover:bg-layer-2'
              )}
            >
              Todo
            </button>
          </div>

          <div className="mt-2 border-t border-layer-3 pt-2">
            {showDates ? (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (datesValid) choose({ kind: 'range', ...dates })
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-text-secondary">
                    Desde
                    <input
                      type="date"
                      value={dates.start}
                      onChange={(e) => setDates({ ...dates, start: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-layer-3 bg-layer-1 px-2 text-sm text-text-primary"
                    />
                  </label>
                  <label className="text-xs text-text-secondary">
                    Hasta
                    <input
                      type="date"
                      value={dates.end}
                      onChange={(e) => setDates({ ...dates, end: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-layer-3 bg-layer-1 px-2 text-sm text-text-primary"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!datesValid}
                  className="h-9 w-full rounded-md bg-accent text-sm font-medium text-accent-foreground disabled:opacity-50"
                >
                  Ver estas fechas
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowDates(true)}
                className={cn(optionClass, 'w-full text-left text-text-secondary hover:bg-layer-2')}
              >
                Elegir fechas…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
