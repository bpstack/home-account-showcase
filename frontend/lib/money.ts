// The one way to write an amount in the app (docs/README.md, «Frontend · Interfaz»): es-ES,
// thousands always grouped ("1.500,00 €"), the true minus sign "−" for expenses, and "—" for a
// value that does not exist. Pages must not format amounts on their own.

const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // es-ES skips the separator below 10.000 ("1500,00 €"); a ledger reads better with it
  useGrouping: 'always',
})

const MINUS = '−'
export const MISSING = '—'

export type SignMode =
  /** Only negatives carry a sign (a balance) */
  | 'auto'
  /** "+" for positives too (income in a list of movements) */
  | 'always'
  /** No sign: the column or the color already says it */
  | 'never'

/** Formats euros: formatMoney(-12.5) → "−12,50 €"; formatMoney(1500, 'always') → "+1.500,00 €". */
export function formatMoney(value: number | null | undefined, sign: SignMode = 'auto'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return MISSING
  // Round first so -0.004 does not show as "−0,00 €"
  const rounded = Math.round(value * 100) / 100
  const body = euros.format(Math.abs(rounded))
  if (rounded === 0 || sign === 'never') return body
  if (rounded < 0) return `${MINUS}${body}`
  return sign === 'always' ? `+${body}` : body
}

const compactEuros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Short amounts for chart axes: "1,5 mil €", "−300 €". */
export function formatMoneyCompact(value: number): string {
  const body = compactEuros.format(Math.abs(value))
  return value < 0 ? `${MINUS}${body}` : body
}
