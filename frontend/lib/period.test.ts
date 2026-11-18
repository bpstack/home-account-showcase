import { describe, expect, it } from 'vitest'
import { periodLabel, periodRange, shiftPeriod, toPeriod, toYearMonth } from './period'

describe('periodRange', () => {
  it('covers the whole month, first and last day included', () => {
    expect(periodRange({ kind: 'month', year: 2026, month: 10 })).toEqual({
      start: '2026-11-01',
      end: '2026-11-30',
    })
  })

  it('knows the length of each month, leap years included', () => {
    expect(periodRange({ kind: 'month', year: 2028, month: 1 }).end).toBe('2028-02-29')
    expect(periodRange({ kind: 'month', year: 2026, month: 1 }).end).toBe('2026-02-28')
    expect(periodRange({ kind: 'month', year: 2026, month: 11 }).end).toBe('2026-12-31')
  })

  it('covers the whole year', () => {
    expect(periodRange({ kind: 'year', year: 2025 })).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    })
  })

  it('ends "everything" today', () => {
    expect(periodRange({ kind: 'all' }, new Date(2026, 10, 18, 23, 30)).end).toBe('2026-11-18')
  })
})

describe('shiftPeriod', () => {
  it('moves across the turn of the year in both directions', () => {
    expect(shiftPeriod({ kind: 'month', year: 2026, month: 11 }, 1)).toEqual({
      kind: 'month',
      year: 2027,
      month: 0,
    })
    expect(shiftPeriod({ kind: 'month', year: 2026, month: 0 }, -1)).toEqual({
      kind: 'month',
      year: 2025,
      month: 11,
    })
  })

  it('moves a year by one', () => {
    expect(shiftPeriod({ kind: 'year', year: 2026 }, -1)).toEqual({ kind: 'year', year: 2025 })
  })
})

describe('periodLabel', () => {
  it('names the period in Spanish', () => {
    expect(periodLabel({ kind: 'month', year: 2026, month: 10 })).toBe('Noviembre 2026')
    expect(periodLabel({ kind: 'year', year: 2026 })).toBe('2026')
    expect(periodLabel({ kind: 'all' })).toBe('Todo')
  })
})

describe('toPeriod and toYearMonth', () => {
  it('round-trip month and year through the filters store', () => {
    const month = { kind: 'month', year: 2026, month: 3 } as const
    const { year, month: m } = toYearMonth(month)
    expect(toPeriod(year, m, null)).toEqual(month)
    expect(toPeriod(2026, null, null)).toEqual({ kind: 'year', year: 2026 })
    expect(toPeriod(null, null, null)).toEqual({ kind: 'all' })
  })

  it('prefers a complete custom range', () => {
    const range = { start: '2026-01-10', end: '2026-02-05' }
    expect(toPeriod(2026, 3, range)).toEqual({ kind: 'range', ...range })
    expect(toPeriod(2026, 3, { start: '', end: '' })).toEqual({
      kind: 'month',
      year: 2026,
      month: 3,
    })
  })
})
