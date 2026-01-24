// services/market/index.ts
// Market Data Aggregator - Combina todas las APIs

import { getCryptoPrices } from './coinGecko.js'
import { getCurrencyRates } from './frankfurter.js'
import { getSP500, getMSCIWorld, getNASDAQ } from './alphaVantage.js'
import { getCachedMarketData, cacheMarketData, getCacheDuration } from './market-cache.js'
import type { MarketData, MarketDataContext, CryptoPrice, CurrencyRate, MarketIndex } from './types.js'

const CACHE_ENABLED = true

export async function getMarketData(): Promise<MarketDataContext> {
  const cacheDuration = getCacheDuration()

  // Try cache first
  if (CACHE_ENABLED) {
    const cached = await getCachedMarketData()
    if (cached) {
      console.log('[Market] Returning cached market data')
      return cached
    }
  }

  console.log('[Market] Fetching fresh market data from all APIs...')
  const startTime = Date.now()

  // Fetch from all APIs in parallel
  const [cryptoData, currencyData, sp500, msci, nasdaq] = await Promise.allSettled([
    getCryptoPrices(['bitcoin', 'ethereum']),
    getCurrencyRates(['USD', 'GBP']),
    getSP500(),
    getMSCIWorld(),
    getNASDAQ()
  ])

  // Process results with fallbacks
  const crypto = cryptoData.status === 'fulfilled' ? cryptoData.value : {} as Record<string, { price: number; change24h: number }>
  const currencies = currencyData.status === 'fulfilled' ? currencyData.value : {} as Record<string, { rate: number; change24h?: number}>

  const result: MarketDataContext = {
    sp500: {
      value: sp500.status === 'fulfilled' ? sp500.value.value : 5890,
      change24h: sp500.status === 'fulfilled' ? sp500.value.change24h : 0
    },
    msciWorld: {
      value: msci.status === 'fulfilled' ? msci.value.value : 3450,
      change24h: msci.status === 'fulfilled' ? msci.value.change24h : 0
    },
    nasdaq: {
      value: nasdaq.status === 'fulfilled' ? nasdaq.value.value : 19250,
      change24h: nasdaq.status === 'fulfilled' ? nasdaq.value.change24h : 0
    },
    btc: {
      value: crypto.bitcoin?.price || 98500,
      change24h: crypto.bitcoin?.change24h || 0
    },
    eth: {
      value: crypto.ethereum?.price || 3450,
      change24h: crypto.ethereum?.change24h || 0
    },
    eurUsd: currencies.USD?.rate || 1.042,
    eurGbp: currencies.GBP?.rate || 0.862,
    lastUpdated: new Date().toISOString()
  }

  const elapsed = Date.now() - startTime
  console.log(`[Market] All data fetched in ${elapsed}ms`)

  // Cache the result
  if (CACHE_ENABLED) {
    await cacheMarketData(result)
  }

  return result
}

export async function getMarketDataFull(): Promise<MarketData & { marketTrend: 'alcista' | 'bajista' | 'neutral' }> {
  const context = await getMarketData()

  // Reuse data from context to avoid double API calls
  const cryptoData = [
    {
      symbol: 'bitcoin',
      name: 'Bitcoin',
      price: context.btc.value,
      change24h: context.btc.change24h,
      source: 'coingecko' as const
    },
    {
      symbol: 'ethereum',
      name: 'Ethereum',
      price: context.eth.value,
      change24h: context.eth.change24h,
      source: 'coingecko' as const
    }
  ]

  const currencyData = [
    {
      pair: 'USD',
      rate: context.eurUsd,
      change24h: 0,
      source: 'frankfurter' as const
    },
    {
      pair: 'GBP',
      rate: context.eurGbp,
      change24h: 0,
      source: 'frankfurter' as const
    }
  ]

  const indices = [
    {
      symbol: 'SP500',
      name: 'S&P 500',
      value: context.sp500.value,
      change24h: context.sp500.change24h,
      source: 'alphavantage' as const
    },
    {
      symbol: 'MSCI',
      name: 'MSCI World',
      value: context.msciWorld.value,
      change24h: context.msciWorld.change24h,
      source: 'alphavantage' as const
    },
    {
      symbol: 'NDX',
      name: 'NASDAQ',
      value: context.nasdaq.value,
      change24h: context.nasdaq.change24h,
      source: 'alphavantage' as const
    }
  ]

  const allChanges: number[] = []

  indices.forEach(i => allChanges.push(i.change24h))
  cryptoData.forEach(c => allChanges.push(c.change24h))

  // Calculate trend as before...
  const avgChange = allChanges.length > 0
    ? allChanges.reduce((a, b) => a + b, 0) / allChanges.length
    : 0

  const marketTrend: 'alcista' | 'bajista' | 'neutral' =
    avgChange > 0.5 ? 'alcista' :
    avgChange < -0.5 ? 'bajista' : 'neutral'

  return {
    cryptocurrencies: cryptoData,
    currencies: currencyData,
    indices: indices,
    cachedAt: new Date().toISOString(),
    cacheExpiresIn: getCacheDuration().seconds,
    marketTrend
  }
}

export async function getCryptoData(): Promise<CryptoPrice[]> {
  const full = await getMarketDataFull()
  return full.cryptocurrencies
}

export async function getCurrencyData(): Promise<CurrencyRate[]> {
  const full = await getMarketDataFull()
  return full.currencies
}

export async function getIndicesData(): Promise<MarketIndex[]> {
  const full = await getMarketDataFull()
  return full.indices
}

export async function getQuickSummary(): Promise<{
  trending: 'up' | 'down' | 'neutral'
  topMover: { name: string; change: number }
  marketSentiment: 'bullish' | 'bearish' | 'neutral'
}> {
  const data = await getMarketData()

  const changes = [
    data.sp500.change24h,
    data.msciWorld.change24h,
    data.nasdaq.change24h,
    data.btc.change24h,
    data.eth.change24h
  ]

  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
  const trending = avgChange > 0.5 ? 'up' : avgChange < -0.5 ? 'down' : 'neutral'

  const allItems = [
    { name: 'S&P 500', change: data.sp500.change24h },
    { name: 'MSCI World', change: data.msciWorld.change24h },
    { name: 'Bitcoin', change: data.btc.change24h }
  ]

  const topMover = allItems.reduce((max, item) =>
    Math.abs(item.change) > Math.abs(max.change) ? item : max
  , allItems[0])

  const sentiment = avgChange > 1 ? 'bullish' : avgChange < -1 ? 'bearish' : 'neutral'

  return {
    trending,
    topMover,
    marketSentiment: sentiment
  }
}

export { getCacheDuration } from './market-cache.js'
export type { MarketDataContext, CryptoPrice, CurrencyRate, MarketIndex } from './types.js'
