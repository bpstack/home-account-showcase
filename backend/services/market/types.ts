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

/** A percentage published for a period: a month ("2026-10") or a day ("2026-11-19") */
export interface Indicator {
  value: number
  period: string
}

/** How the economy is doing; each indicator is null when its source did not answer */
export interface Economy {
  /** Annual HICP inflation in Spain, % (Eurostat) */
  inflationSpain: Indicator | null
  /** 12-month Euribor, monthly average, % (ECB) */
  euribor12m: Indicator | null
  /** ECB deposit facility rate, % (ECB) */
  ecbDepositRate: Indicator | null
  /** Unemployment rate in Spain, seasonally adjusted, % (Eurostat) */
  unemploymentSpain: Indicator | null
}

export interface MarketData {
  cryptocurrencies: CryptoPrice[]
  currencies: CurrencyRate[]
  economy: Economy
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
  economy: Economy
}

/** The quotes alone, as cached for a few minutes; the economy has a cache of its own */
export type MarketQuotes = Omit<MarketDataContext, 'economy'>

export const CRYPTO_COINS = ['bitcoin', 'ethereum'] as const
export const CURRENCY_PAIRS = ['USD', 'GBP'] as const

export type CryptoCoin = (typeof CRYPTO_COINS)[number]
export type CurrencyPair = (typeof CURRENCY_PAIRS)[number]
