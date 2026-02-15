// services/market/alphaVantage.ts
// Alpha Vantage API - Indices and stocks (25 calls/day free)

import type { MarketIndex } from './types.js'
import { logger } from '../../utils/logger.js'

const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query'
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY

const INDEX_INFO: Record<string, { name: string; symbol: string }> = {
  SP500: { name: 'S&P 500', symbol: 'SPY' },
  MSCI: { name: 'MSCI World', symbol: 'URTH' },
  NASDAQ: { name: 'NASDAQ', symbol: 'QQQ' },
  DOW: { name: 'Dow Jones', symbol: 'DIA' },
  NIKKEI: { name: 'Nikkei 225', symbol: '^N225' },
}

export async function getIndexPrice(
  indexKey: keyof typeof INDEX_INFO
): Promise<MarketIndex | null> {
  if (!API_KEY) {
    logger.warn('ALPHA_VANTAGE', 'getIndexPrice', 'API key not configured')
    return getFallbackIndexPrice(indexKey)
  }

  const index = INDEX_INFO[indexKey]
  if (!index) {
    logger.error(
      'ALPHA_VANTAGE',
      'getIndexPrice',
      `Unknown index: ${indexKey}`,
      new Error('Unknown index')
    )
    return null
  }

  const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${index.symbol}&apikey=${API_KEY}`

  const startTime = Date.now()
  logger.info('ALPHA_VANTAGE', 'getIndexPrice', `Fetching ${index.name} (${index.symbol})`)

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        'ALPHA_VANTAGE',
        'getIndexPrice',
        `API error: ${response.status}`,
        new Error(errorText)
      )
      return getFallbackIndexPrice(indexKey)
    }

    const data = await response.json()
    const elapsed = Date.now() - startTime
    logger.info('ALPHA_VANTAGE', 'getIndexPrice', `Response received in ${elapsed}ms`)

    const quote = data['Global Quote']
    if (!quote || Object.keys(quote).length === 0) {
      logger.warn('ALPHA_VANTAGE', 'getIndexPrice', `No data for ${index.name}`)
      return getFallbackIndexPrice(indexKey)
    }

    const price = parseFloat(quote['05. price'] || '0')
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '') || '0')

    return {
      symbol: indexKey,
      name: index.name,
      value: price,
      change24h: changePercent,
      source: 'alphavantage',
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    logger.error('ALPHA_VANTAGE', 'getIndexPrice', `Error after ${elapsed}ms`, error as Error)
    return getFallbackIndexPrice(indexKey)
  } finally {
    await delay(1500)
  }
}

export async function getMultipleIndices(
  indexKeys: (keyof typeof INDEX_INFO)[]
): Promise<MarketIndex[]> {
  const results: MarketIndex[] = []

  for (const key of indexKeys) {
    const index = await getIndexPrice(key)
    if (index) {
      results.push(index)
    }
  }

  return results
}

export async function getSP500(): Promise<MarketIndex> {
  const result = await getIndexPrice('SP500')
  return result || getFallbackIndexPrice('SP500')
}

export async function getMSCIWorld(): Promise<MarketIndex> {
  const result = await getIndexPrice('MSCI')
  return result || getFallbackIndexPrice('MSCI')
}

export async function getNASDAQ(): Promise<MarketIndex> {
  const result = await getIndexPrice('NASDAQ')
  return result || getFallbackIndexPrice('NASDAQ')
}

function getFallbackIndexPrice(indexKey: string): MarketIndex {
  logger.warn('ALPHA_VANTAGE', 'getFallbackIndexPrice', `Using fallback price for ${indexKey}`)

  const fallbacks: Record<string, MarketIndex> = {
    SP500: {
      symbol: 'SP500',
      name: 'S&P 500',
      value: 5890.25,
      change24h: 2.3,
      source: 'alphavantage',
    },
    MSCI: {
      symbol: 'MSCI',
      name: 'MSCI World',
      value: 3450.8,
      change24h: 1.8,
      source: 'alphavantage',
    },
    NASDAQ: {
      symbol: 'NASDAQ',
      name: 'NASDAQ',
      value: 19250.5,
      change24h: 3.1,
      source: 'alphavantage',
    },
    DOW: {
      symbol: 'DOW',
      name: 'Dow Jones',
      value: 42500.0,
      change24h: 1.5,
      source: 'alphavantage',
    },
    NIKKEI: {
      symbol: 'NIKKEI',
      name: 'Nikkei 225',
      value: 39200.0,
      change24h: -0.5,
      source: 'alphavantage',
    },
  }

  return (
    fallbacks[indexKey] || {
      symbol: indexKey,
      name: INDEX_INFO[indexKey]?.name || indexKey,
      value: 0,
      change24h: 0,
      source: 'alphavantage',
    }
  )
}

export function getAlphaVantageStatus(): {
  configured: boolean
  dailyLimit: number
  remaining: number
} {
  return {
    configured: !!API_KEY,
    dailyLimit: 25,
    remaining: API_KEY ? 25 : 0,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
