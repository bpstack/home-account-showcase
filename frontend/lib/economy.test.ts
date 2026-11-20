// The economy table (2026-11-19): each figure as a Spanish percentage with the period it belongs
// to, and a dash, never a number, when the source did not give it. ICU may or may not put a dot
// after the short month, so the month is matched with or without it.
import { describe, expect, it } from 'vitest'
import { ECONOMY_ROWS, formatIndicator, formatIndicatorPeriod } from './economy'

describe('economy figures', () => {
  it('writes the value as a Spanish percentage', () => {
    expect(formatIndicator({ value: 4.9, period: '2026-10' })).toBe('4,9 %')
    expect(formatIndicator({ value: 3.2385909, period: '2026-10' })).toBe('3,24 %')
    expect(formatIndicator({ value: 2.5, period: '2026-11-19' })).toBe('2,5 %')
    expect(formatIndicator({ value: 10.3, period: '2026-09' })).toBe('10,3 %')
  })

  it('names the month a monthly figure belongs to, and the day of a daily one', () => {
    expect(formatIndicatorPeriod({ value: 4.9, period: '2026-10' })).toMatch(/^oct\.? 2026$/)
    expect(formatIndicatorPeriod({ value: 2.5, period: '2026-11-19' })).toMatch(/^19 nov\.? 2026$/)
  })

  it('does not move a month across a time zone: January stays January', () => {
    expect(formatIndicatorPeriod({ value: 1, period: '2026-01' })).toMatch(/^ene\.? 2026$/)
  })

  it('shows a missing figure as a dash, value and period alike', () => {
    expect(formatIndicator(null)).toBe('—')
    expect(formatIndicatorPeriod(null)).toBe('—')
  })

  it('has a row for each of the four indicators the API sends', () => {
    expect(ECONOMY_ROWS.map((row) => row.key).sort()).toEqual(
      ['ecbDepositRate', 'euribor12m', 'inflationSpain', 'unemploymentSpain'].sort()
    )
  })
})
