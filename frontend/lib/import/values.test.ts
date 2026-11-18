import { describe, expect, it } from 'vitest'
import {
  cleanText,
  detectDateOrder,
  detectDecimalSeparator,
  parseAmount,
  parseDate,
} from './values'

describe('parseAmount', () => {
  it('reads Spanish amounts', () => {
    expect(parseAmount('1.234,56', ',')).toBe(1234.56)
    expect(parseAmount('-12,50 €', ',')).toBe(-12.5)
    expect(parseAmount('+7,00', ',')).toBe(7)
    expect(parseAmount('1 234,56 EUR', ',')).toBe(1234.56)
    expect(parseAmount('1\u00a0234,56', ',')).toBe(1234.56)
  })

  it('reads English amounts', () => {
    expect(parseAmount('1,234.56', '.')).toBe(1234.56)
    expect(parseAmount('-12.50', '.')).toBe(-12.5)
  })

  it('reads the other ways banks write a negative amount', () => {
    expect(parseAmount('(12,50)', ',')).toBe(-12.5)
    expect(parseAmount('12,50-', ',')).toBe(-12.5)
  })

  it('keeps numbers from Excel cells as they are', () => {
    expect(parseAmount(-3.5)).toBe(-3.5)
    expect(parseAmount(0)).toBe(0)
  })

  it('returns null for empty or non-numeric values', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('12,5,0', ',')).toBeNull()
    expect(parseAmount(null)).toBeNull()
    expect(parseAmount(Number.NaN)).toBeNull()
  })
})

describe('detectDecimalSeparator', () => {
  it('detects comma decimals', () => {
    expect(detectDecimalSeparator(['1.234,56', '-12,50', '3'])).toBe(',')
  })

  it('detects dot decimals', () => {
    expect(detectDecimalSeparator(['1,234.56', '12.50'])).toBe('.')
  })

  it('defaults to comma without evidence', () => {
    expect(detectDecimalSeparator(['100', 7, null])).toBe(',')
  })
})

describe('parseDate', () => {
  it('reads Excel date serials', () => {
    expect(parseDate(44927)).toBe('2023-01-01')
    expect(parseDate(44927.75)).toBe('2023-01-01')
  })

  it('reads day-first text dates', () => {
    expect(parseDate('18/11/2026', 'dmy')).toBe('2026-11-18')
    expect(parseDate('18-11-26', 'dmy')).toBe('2026-11-18')
    expect(parseDate('18.11.2026', 'dmy')).toBe('2026-11-18')
    expect(parseDate('5/3/2026', 'dmy')).toBe('2026-03-05')
  })

  it('reads month-first and ISO dates', () => {
    expect(parseDate('11/18/2026', 'mdy')).toBe('2026-11-18')
    expect(parseDate('2026-11-18', 'dmy')).toBe('2026-11-18')
    expect(parseDate('2026-11-18 10:30:00', 'dmy')).toBe('2026-11-18')
  })

  it('rejects impossible or missing dates', () => {
    expect(parseDate('31/02/2026', 'dmy')).toBeNull()
    expect(parseDate('13/13/2026', 'dmy')).toBeNull()
    expect(parseDate('ayer', 'dmy')).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate(12)).toBeNull()
  })
})

describe('detectDateOrder', () => {
  it('detects day first when a first part is above 12', () => {
    expect(detectDateOrder(['05/03/2026', '18/03/2026'])).toBe('dmy')
  })

  it('detects month first when a second part is above 12', () => {
    expect(detectDateOrder(['03/05/2026', '03/18/2026'])).toBe('mdy')
  })

  it('defaults to day first', () => {
    expect(detectDateOrder(['05/03/2026', 44927])).toBe('dmy')
  })
})

describe('cleanText', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanText('  Compra   en\ttienda \n')).toBe('Compra en tienda')
    expect(cleanText(null)).toBe('')
  })
})
