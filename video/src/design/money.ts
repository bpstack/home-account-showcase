// The app's amount format (frontend/lib/money.ts): es-ES, thousands always grouped,
// the true minus sign "−" for expenses.

const euros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // es-ES skips the separator below 10.000; the app forces it. Chromium supports 'always', the
  // video's TypeScript lib only knows the boolean form.
  useGrouping: 'always' as unknown as boolean,
})

const MINUS = '−'

export type SignMode = 'auto' | 'always' | 'never'

export function formatMoney(value: number, sign: SignMode = 'auto'): string {
  const rounded = Math.round(value * 100) / 100
  const body = euros.format(Math.abs(rounded))
  if (rounded === 0 || sign === 'never') return body
  if (rounded < 0) return `${MINUS}${body}`
  return sign === 'always' ? `+${body}` : body
}
