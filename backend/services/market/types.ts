// services/market/types.ts
// Tipos para datos de mercado

export interface CryptoPrice {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h?: number
  marketCap?: number
  source: 'coingecko'
}

export interface CurrencyRate {
  pair: string
  rate: number
  change24h?: number
  source: 'frankfurter'
}

export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change24h: number
  source: 'alphavantage' | 'yahoo'
}

export interface MarketData {
  cryptocurrencies: CryptoPrice[]
  currencies: CurrencyRate[]
  indices: MarketIndex[]
  cachedAt: string
  cacheExpiresIn: number // segundos
  marketTrend?: 'alcista' | 'bajista' | 'neutral'
}

export interface MarketDataContext {
  sp500: { value: number; change24h: number }
  msciWorld: { value: number; change24h: number }
  nasdaq: { value: number; change24h: number }
  btc: { value: number; change24h: number }
  eth: { value: number; change24h: number }
  eurUsd: number
  eurGbp: number
  lastUpdated: string
}

export interface MarketCacheEntry {
  id: string
  symbol: string
  source: string
  data: string // JSON stringified
  cachedAt: Date
  expiresAt: Date
}

export const CRYPTO_COINS = ['bitcoin', 'ethereum'] as const
export const CURRENCY_PAIRS = ['USD', 'GBP'] as const
export const INDEX_SYMBOLS: Record<string, string> = {
  SP500: 'SPY',
  MSCI: 'URTH',
  NASDAQ: 'QQQ'
} as const

export type CryptoCoin = typeof CRYPTO_COINS[number]
export type CurrencyPair = typeof CURRENCY_PAIRS[number]
export type IndexSymbol = keyof typeof INDEX_SYMBOLS
