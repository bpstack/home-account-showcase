import { describe, expect, it } from 'vitest'
import { formatMoney, formatMoneyCompact } from './money'

// Intl puts a no-break space (U+00A0) before the euro sign; compare with plain spaces
const plain = (s: string) => s.replace(/\u00a0/g, ' ')

describe('formatMoney', () => {
  it('writes Spanish amounts with the thousands always grouped', () => {
    expect(plain(formatMoney(1500))).toBe('1.500,00 €')
    expect(plain(formatMoney(1234567.891))).toBe('1.234.567,89 €')
    expect(plain(formatMoney(15.9))).toBe('15,90 €')
  })

  it('uses the true minus sign for negatives, and "+" only when asked', () => {
    expect(plain(formatMoney(-15.99))).toBe('−15,99 €')
    expect(plain(formatMoney(2500, 'always'))).toBe('+2.500,00 €')
    expect(plain(formatMoney(-2500, 'never'))).toBe('2.500,00 €')
  })

  it('shows a real zero without a sign', () => {
    expect(plain(formatMoney(0, 'always'))).toBe('0,00 €')
    expect(plain(formatMoney(-0.004))).toBe('0,00 €')
  })

  it('shows a dash for a value that does not exist, never "+-"', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined, 'always')).toBe('—')
    expect(formatMoney(Number.NaN)).toBe('—')
  })
})

describe('formatMoneyCompact', () => {
  it('writes axis amounts in euros, short, with the true minus sign', () => {
    expect(plain(formatMoneyCompact(1500))).toBe('1,5 mil €')
    expect(plain(formatMoneyCompact(-300))).toBe('−300 €')
    expect(plain(formatMoneyCompact(0))).toBe('0 €')
  })
})
