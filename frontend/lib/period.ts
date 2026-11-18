// The period a page shows: one month, one year, everything, or a range of dates. Dates are
// built from local calendar fields, never through toISOString(), which converts to UTC and
// shifts them by a day in Spain (UTC+1/+2).

import { MONTHS_ES } from './constants'

export type Period =
  | { kind: 'month'; year: number; month: number } // month: 0-11
  | { kind: 'year'; year: number }
  | { kind: 'all' }
  | { kind: 'range'; start: string; end: string } // YYYY-MM-DD, both included

/** Earliest date used for "everything" */
const ALL_START = '2000-01-01'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** A local calendar date as YYYY-MM-DD. */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

function today(now: Date): string {
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

function lastDayOfMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one (local time, no UTC conversion)
  return new Date(year, month + 1, 0).getDate()
}

export function currentMonth(now: Date = new Date()): Period {
  return { kind: 'month', year: now.getFullYear(), month: now.getMonth() }
}

/** First and last day of the period, both included. */
export function periodRange(
  period: Period,
  now: Date = new Date()
): { start: string; end: string } {
  switch (period.kind) {
    case 'month':
      return {
        start: isoDate(period.year, period.month, 1),
        end: isoDate(period.year, period.month, lastDayOfMonth(period.year, period.month)),
      }
    case 'year':
      return { start: isoDate(period.year, 0, 1), end: isoDate(period.year, 11, 31) }
    case 'all':
      return { start: ALL_START, end: today(now) }
    case 'range':
      return { start: period.start, end: period.end }
  }
}

/** The previous (-1) or next (+1) month or year; other periods have no neighbour. */
export function shiftPeriod(period: Period, delta: -1 | 1): Period {
  if (period.kind === 'year') return { kind: 'year', year: period.year + delta }
  if (period.kind !== 'month') return period
  const index = period.year * 12 + period.month + delta
  return { kind: 'month', year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 }
}

/** The period to compare with: the month or year before; nothing for "everything" or a range. */
export function previousPeriod(period: Period): Period | null {
  return canShift(period) ? shiftPeriod(period, -1) : null
}

export function canShift(period: Period): boolean {
  return period.kind === 'month' || period.kind === 'year'
}

const shortDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number)
  return shortDate.format(new Date(y, m - 1, d))
}

/** What the period selector shows: "Noviembre 2026", "2026", "Todo", "3 nov 2026 – 5 dic 2026". */
export function periodLabel(period: Period): string {
  switch (period.kind) {
    case 'month':
      return `${MONTHS_ES[period.month]} ${period.year}`
    case 'year':
      return String(period.year)
    case 'all':
      return 'Todo'
    case 'range':
      return `${formatDate(period.start)} – ${formatDate(period.end)}`
  }
}

/** Reads the period from the filters store (year/month) and a page's custom range. */
export function toPeriod(
  year: number | null,
  month: number | null,
  range: { start: string; end: string } | null,
  now: Date = new Date()
): Period {
  if (range && range.start && range.end) return { kind: 'range', ...range }
  if (month !== null) return { kind: 'month', year: year ?? now.getFullYear(), month }
  if (year !== null) return { kind: 'year', year }
  return { kind: 'all' }
}

/** The year/month the filters store keeps for a period (null: not set). */
export function toYearMonth(period: Period): { year: number | null; month: number | null } {
  switch (period.kind) {
    case 'month':
      return { year: period.year, month: period.month }
    case 'year':
      return { year: period.year, month: null }
    default:
      return { year: null, month: null }
  }
}
