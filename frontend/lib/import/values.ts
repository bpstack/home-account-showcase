// Turning raw cell values into amounts and dates. Excel cells arrive as numbers; CSV cells arrive
// as text, in whatever format the bank uses. Formats are decided per column, looking at every
// value, so "1.234" is read the same way in all rows.

/** Which character separates decimals in a column of text amounts. */
export type DecimalSeparator = ',' | '.'

/** Which part comes first in a column of text dates with two-digit day and month. */
export type DateOrder = 'dmy' | 'mdy'

const CURRENCY_AND_SPACES = /[€$£]|EUR|USD|GBP|\s|\u00a0/gi

function cleanAmountText(value: string): string {
  return value.replace(CURRENCY_AND_SPACES, '')
}

/**
 * Decides the decimal separator of a column of text amounts.
 * A comma followed by one or two digits at the end means comma decimals (Spanish style); a dot
 * followed by one or two digits means dot decimals. With no evidence, comma (Spain is the default).
 */
export function detectDecimalSeparator(values: unknown[]): DecimalSeparator {
  let comma = 0
  let dot = 0
  for (const value of values) {
    if (typeof value !== 'string') continue
    const text = cleanAmountText(value)
    if (/,\d{1,2}\)?-?$/.test(text)) comma++
    else if (/\.\d{1,2}\)?-?$/.test(text)) dot++
  }
  return dot > comma ? '.' : ','
}

/** Parses an amount. Returns null when the value is empty or not a number. */
export function parseAmount(value: unknown, decimal: DecimalSeparator = ','): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null

  let text = cleanAmountText(value)
  if (text === '') return null

  // Negative forms: -12,50 · (12,50) · 12,50-
  let negative = false
  if (/^\(.*\)$/.test(text)) {
    negative = true
    text = text.slice(1, -1)
  }
  if (text.endsWith('-')) {
    negative = !negative
    text = text.slice(0, -1)
  }
  if (text.startsWith('-')) {
    negative = !negative
    text = text.slice(1)
  } else if (text.startsWith('+')) {
    text = text.slice(1)
  }

  const thousands = decimal === ',' ? '.' : ','
  if (!/^[\d.,]+$/.test(text)) return null
  text = text.split(thousands).join('')
  if (decimal === ',') text = text.replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null

  const number = Number(text)
  if (!Number.isFinite(number)) return null
  return negative ? -number : number
}

const TEXT_DATE = /^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[ T].*)?$/

/** Decides day/month order for a column of text dates; day first unless the data says otherwise. */
export function detectDateOrder(values: unknown[]): DateOrder {
  for (const value of values) {
    if (typeof value !== 'string') continue
    const match = TEXT_DATE.exec(value.trim())
    if (!match || match[1].length === 4) continue
    const first = Number(match[1])
    const second = Number(match[2])
    if (first > 12) return 'dmy'
    if (second > 12) return 'mdy'
  }
  return 'dmy'
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1) return null // 31/02 and friends
  return date.toISOString().slice(0, 10)
}

// Excel stores dates as days since 1899-12-30. Serials in this range cover 1954-12-04 to 2119-01-09.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MIN_SERIAL = 20000
const MAX_SERIAL = 80000

/** Parses a date into YYYY-MM-DD. Returns null when the value is empty or not a valid date. */
export function parseDate(value: unknown, order: DateOrder = 'dmy'): string | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < MIN_SERIAL || value > MAX_SERIAL) return null
    const date = new Date(EXCEL_EPOCH_MS + Math.floor(value) * 86_400_000)
    return date.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') return null

  const match = TEXT_DATE.exec(value.trim())
  if (!match) return null
  const [, a, b, c] = match

  if (a.length === 4) return isoDate(Number(a), Number(b), Number(c)) // YYYY-MM-DD
  if (c.length !== 2 && c.length !== 4) return null

  let year = Number(c)
  if (c.length === 2) year += year < 70 ? 2000 : 1900
  const [day, month] = order === 'dmy' ? [Number(a), Number(b)] : [Number(b), Number(a)]
  return isoDate(year, month, day)
}

/** Normalises a text cell: trims and collapses whitespace. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}
