import type { Economy, Indicator } from './api/investment'
import { MISSING } from './money'

const percent = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})
const month = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const day = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** The rows of the economy table, in order, with what each indicator is */
export const ECONOMY_ROWS: { key: keyof Economy; name: string; detail: string }[] = [
  { key: 'inflationSpain', name: 'Inflación en España', detail: 'interanual' },
  { key: 'euribor12m', name: 'Euríbor a 12 meses', detail: 'media del mes' },
  { key: 'ecbDepositRate', name: 'Tipo del BCE', detail: 'facilidad de depósito' },
  { key: 'unemploymentSpain', name: 'Paro en España', detail: 'desestacionalizado' },
]

/** "4,9 %", or a dash when the source did not give it */
export function formatIndicator(indicator: Indicator | null): string {
  return indicator ? `${percent.format(indicator.value)} %` : MISSING
}

/**
 * The period a figure belongs to: "oct 2026" for a month ("2026-10"), "19 nov 2026" for a day
 * ("2026-11-19"); anything else as it came, and a dash when there is no figure
 */
export function formatIndicatorPeriod(indicator: Indicator | null): string {
  if (!indicator) return MISSING
  const parts = indicator.period.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!parts) return indicator.period
  const [, year, mm, dd] = parts
  const date = new Date(Date.UTC(Number(year), Number(mm) - 1, dd ? Number(dd) : 1))
  return (dd ? day : month).format(date)
}
