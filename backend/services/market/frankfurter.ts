// services/market/frankfurter.ts
// Frankfurter API - ECB reference rates against the euro (100% free, no API key)

import type { CurrencyPair, Quote } from './types.js'
import { logger } from '../../utils/logger.js'

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v1'
// Enough days back to hold two working days across a weekend and a bank holiday
const DAYS_BACK = 10

/**
 * Rate of each currency against the euro on the last published day, and its change from the
 * working day before; a currency Frankfurter does not give is left out
 */
export async function getCurrencyRates(
  currencies: readonly CurrencyPair[]
): Promise<Partial<Record<CurrencyPair, Quote>>> {
  const start = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const url = `${FRANKFURTER_BASE}/${start}..?from=EUR&to=${currencies.join(',')}`
  const startTime = Date.now()

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })

    if (!response.ok) {
      logger.warn('FRANKFURTER', 'getCurrencyRates', `API error ${response.status}`)
      return {}
    }

    const data = await response.json()
    logger.info(
      'FRANKFURTER',
      'getCurrencyRates',
      `Response received in ${Date.now() - startTime}ms`
    )

    const days = Object.keys(data.rates ?? {}).sort()
    const last = data.rates?.[days[days.length - 1]] ?? {}
    const previous = data.rates?.[days[days.length - 2]] ?? {}

    const result: Partial<Record<CurrencyPair, Quote>> = {}
    for (const currency of currencies) {
      const rate = last[currency]
      if (typeof rate !== 'number' || rate <= 0) continue
      const before = previous[currency]
      result[currency] = {
        value: rate,
        change24h:
          typeof before === 'number' && before > 0 ? ((rate - before) / before) * 100 : null,
      }
    }
    return result
  } catch (error) {
    logger.error(
      'FRANKFURTER',
      'getCurrencyRates',
      `Error after ${Date.now() - startTime}ms`,
      error as Error
    )
    return {}
  }
}
