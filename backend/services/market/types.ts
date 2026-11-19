// services/market/types.ts
// Market data types. A value a source could not give is null: there are no fallback figures.

export interface CryptoPrice {
  symbol: string
  name: string
  price: number | null
  change24h: number | null
  source: 'coingecko'
}

export interface CurrencyRate {
  pair: string
  rate: number | null
  change24h: number | null
  source: 'frankfurter'
}

export interface MarketData {
  cryptocurrencies: CryptoPrice[]
  currencies: CurrencyRate[]
  cachedAt: string
  cacheExpiresIn: number // segundos
  /** null when no change is known */
  marketTrend: 'alcista' | 'bajista' | 'neutral' | null
}

export interface Quote {
  value: number
  change24h: number | null
}

/** Each figure is null when its source did not answer */
export interface MarketDataContext {
  btc: Quote | null
  eth: Quote | null
  /** Dollars per euro */
  eurUsd: Quote | null
  /** Pounds per euro */
  eurGbp: Quote | null
  lastUpdated: string
}

export const CRYPTO_COINS = ['bitcoin', 'ethereum'] as const
export const CURRENCY_PAIRS = ['USD', 'GBP'] as const

export type CryptoCoin = (typeof CRYPTO_COINS)[number]
export type CurrencyPair = (typeof CURRENCY_PAIRS)[number]
