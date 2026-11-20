// services/market/index.ts
// Market Data Aggregator - Combines all APIs. A figure no source gives stays null: it is never
// replaced by a made-up one.

import { getCryptoPrices } from './coinGecko.js'
import { getCurrencyRates } from './frankfurter.js'
import { fetchEconomy } from './economy.js'
import {
  readCache,
  writeCache,
  getCacheDuration,
  PARTIAL_CACHE_DURATION_MS,
  ECONOMY_CACHE_DURATION_MS,
  ECONOMY_PARTIAL_CACHE_DURATION_MS,
} from './market-cache.js'
import type {
  CryptoCoin,
  CurrencyPair,
  Economy,
  MarketData,
  MarketDataContext,
  MarketQuotes,
  Quote,
} from './types.js'
import { logger } from '../../utils/logger.js'

type Trend = 'alcista' | 'bajista' | 'neutral'

/** True when every source answered */
export function isComplete(quotes: MarketQuotes): boolean {
  return [quotes.btc, quotes.eth, quotes.eurUsd, quotes.eurGbp].every((quote) => quote !== null)
}

/** True when every economic indicator came */
export function isEconomyComplete(economy: Economy): boolean {
  return Object.values(economy).every((indicator) => indicator !== null)
}

/** Quotes and economy, each from its own cache or, when it has expired, from its sources */
export async function getMarketData(): Promise<MarketDataContext> {
  const [quotes, economy] = await Promise.all([getQuotes(), getEconomy()])
  return { ...quotes, economy }
}

async function getEconomy(): Promise<Economy> {
  const cached = await readCache<Economy>('economy')
  if (cached) return cached

  const economy = await fetchEconomy()
  await writeCache(
    'economy',
    economy,
    isEconomyComplete(economy) ? ECONOMY_CACHE_DURATION_MS : ECONOMY_PARTIAL_CACHE_DURATION_MS
  )
  return economy
}

async function getQuotes(): Promise<MarketQuotes> {
  const cached = await readCache<MarketQuotes>('aggregate-v2')
  if (cached) return cached

  logger.info('MARKET', 'getQuotes', 'Fetching fresh quotes')
  const startTime = Date.now()

  const [crypto, currencies] = await Promise.all([
    getCryptoPrices(['bitcoin', 'ethereum']),
    getCurrencyRates(['USD', 'GBP']),
  ])

  const result = buildMarketContext({ crypto, currencies }, new Date())

  const complete = isComplete(result)
  logger.info(
    'MARKET',
    'getQuotes',
    `Fetched in ${Date.now() - startTime}ms${complete ? '' : ', with missing figures'}`
  )

  await writeCache(
    'aggregate-v2',
    result,
    complete ? getCacheDuration().ms : PARTIAL_CACHE_DURATION_MS
  )

  return result
}

export function buildMarketContext(
  sources: {
    crypto: Partial<Record<CryptoCoin, Quote>>
    currencies: Partial<Record<CurrencyPair, Quote>>
  },
  now: Date
): MarketQuotes {
  return {
    btc: sources.crypto.bitcoin ?? null,
    eth: sources.crypto.ethereum ?? null,
    eurUsd: sources.currencies.USD ?? null,
    eurGbp: sources.currencies.GBP ?? null,
    lastUpdated: now.toISOString(),
  }
}

/** The market card's rows: every row is there, with null where its source did not answer */
export function buildMarketDataFull(context: MarketDataContext): MarketData {
  const cryptocurrencies = [
    { symbol: 'BTC', name: 'Bitcoin', quote: context.btc },
    { symbol: 'ETH', name: 'Ethereum', quote: context.eth },
  ].map(({ symbol, name, quote }) => ({
    symbol,
    name,
    price: quote?.value ?? null,
    change24h: quote?.change24h ?? null,
    source: 'coingecko' as const,
  }))

  const currencies = [
    { pair: 'EUR/USD', quote: context.eurUsd },
    { pair: 'EUR/GBP', quote: context.eurGbp },
  ].map(({ pair, quote }) => ({
    pair,
    rate: quote?.value ?? null,
    change24h: quote?.change24h ?? null,
    source: 'frankfurter' as const,
  }))

  // The trend only from the changes that are known; with none, there is no trend to tell
  const changes = cryptocurrencies
    .map((row) => row.change24h)
    .filter((change): change is number => change !== null)
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
  const marketTrend: Trend | null =
    changes.length === 0
      ? null
      : avgChange > 0.5
        ? 'alcista'
        : avgChange < -0.5
          ? 'bajista'
          : 'neutral'

  return {
    cryptocurrencies,
    currencies,
    economy: context.economy,
    cachedAt: context.lastUpdated,
    cacheExpiresIn: getCacheDuration().seconds,
    marketTrend,
  }
}

export async function getMarketDataFull(): Promise<MarketData> {
  return buildMarketDataFull(await getMarketData())
}

export type { MarketDataContext } from './types.js'
