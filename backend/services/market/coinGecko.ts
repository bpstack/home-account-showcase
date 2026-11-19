// services/market/coinGecko.ts
// CoinGecko API - Cryptocurrencies (100% free, no API key)

import type { CryptoCoin, Quote } from './types.js'
import { logger } from '../../utils/logger.js'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

/** Price in euros and daily change of each coin; a coin CoinGecko does not give is left out */
export async function getCryptoPrices(
  coins: readonly CryptoCoin[]
): Promise<Partial<Record<CryptoCoin, Quote>>> {
  const url = `${COINGECKO_BASE}/simple/price?ids=${coins.join(',')}&vs_currencies=eur&include_24hr_change=true`
  const startTime = Date.now()

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } })

    if (!response.ok) {
      logger.warn('COINGECKO', 'getCryptoPrices', `API error ${response.status}`)
      return {}
    }

    const data = await response.json()
    logger.info('COINGECKO', 'getCryptoPrices', `Response received in ${Date.now() - startTime}ms`)

    const result: Partial<Record<CryptoCoin, Quote>> = {}
    for (const coin of coins) {
      const price = data[coin]?.eur
      if (typeof price !== 'number' || price <= 0) continue
      const change = data[coin].eur_24h_change
      result[coin] = { value: price, change24h: typeof change === 'number' ? change : null }
    }
    return result
  } catch (error) {
    logger.error(
      'COINGECKO',
      'getCryptoPrices',
      `Error after ${Date.now() - startTime}ms`,
      error as Error
    )
    return {}
  }
}
