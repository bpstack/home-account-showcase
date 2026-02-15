// services/market/frankfurter.ts
// Frankfurter API - Currencies (100% free, no API key)

import type { CurrencyRate, CurrencyPair } from './types.js'
import { logger } from '../../utils/logger.js'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'

export async function getCurrencyRates(
  currencies: CurrencyPair[] = ['USD', 'GBP']
): Promise<Record<CurrencyPair, CurrencyRate>> {
  const symbols = currencies.join(',')
  const url = `${FRANKFURTER_BASE}/latest?from=EUR&to=${symbols}`

  const startTime = Date.now()
  logger.info('FRANKFURTER', 'getCurrencyRates', `Fetching rates for: ${currencies.join(', ')}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        'FRANKFURTER',
        'getCurrencyRates',
        `API error: ${response.status}`,
        new Error(errorText)
      )
      return getFallbackCurrencyRates(currencies)
    }

    const data = await response.json()
    const elapsed = Date.now() - startTime
    logger.info('FRANKFURTER', 'getCurrencyRates', `Response received in ${elapsed}ms`)

    const result: Record<CurrencyPair, CurrencyRate> = {} as Record<CurrencyPair, CurrencyRate>

    for (const currency of currencies) {
      if (data.rates && data.rates[currency]) {
        const rate = data.rates[currency]

        const change24h = await getCurrencyChange24h(currency)

        result[currency] = {
          pair: `EUR/${currency}`,
          rate: rate,
          change24h: change24h,
          source: 'frankfurter',
        }
      }
    }

    return result
  } catch (error) {
    const elapsed = Date.now() - startTime
    logger.error('FRANKFURTER', 'getCurrencyRates', `Error after ${elapsed}ms`, error as Error)
    return getFallbackCurrencyRates(currencies)
  }
}

async function getCurrencyChange24h(currency: CurrencyPair): Promise<number> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  try {
    const url = `${FRANKFURTER_BASE}/${dateStr}?from=EUR&to=${currency}`
    const response = await fetch(url)

    if (!response.ok) return 0

    const data = await response.json()
    const yesterdayRate = data.rates?.[currency]

    if (yesterdayRate) {
      const currentUrl = `${FRANKFURTER_BASE}/latest?from=EUR&to=${currency}`
      const currentResponse = await fetch(currentUrl)
      const currentData = await currentResponse.json()
      const currentRate = currentData.rates?.[currency]

      if (currentRate && yesterdayRate) {
        return ((currentRate - yesterdayRate) / yesterdayRate) * 100
      }
    }
  } catch (error) {
    logger.warn('FRANKFURTER', 'getCurrencyChange24h', `Could not fetch 24h change for ${currency}`)
  }

  return 0
}

function getFallbackCurrencyRates(currencies: CurrencyPair[]): Record<CurrencyPair, CurrencyRate> {
  logger.warn('FRANKFURTER', 'getFallbackCurrencyRates', 'Using fallback rates')

  const fallbackRates: Record<CurrencyPair, CurrencyRate> = {
    USD: {
      pair: 'EUR/USD',
      rate: 1.042,
      change24h: 0.15,
      source: 'frankfurter',
    },
    GBP: {
      pair: 'EUR/GBP',
      rate: 0.862,
      change24h: -0.08,
      source: 'frankfurter',
    },
    JPY: {
      pair: 'EUR/JPY',
      rate: 163.5,
      change24h: 0.1,
      source: 'frankfurter',
    },
    CHF: {
      pair: 'EUR/CHF',
      rate: 0.94,
      change24h: 0.05,
      source: 'frankfurter',
    },
    CAD: {
      pair: 'EUR/CAD',
      rate: 1.48,
      change24h: -0.1,
      source: 'frankfurter',
    },
    AUD: {
      pair: 'EUR/AUD',
      rate: 1.62,
      change24h: 0.2,
      source: 'frankfurter',
    },
  }

  const result: Record<CurrencyPair, CurrencyRate> = {} as Record<CurrencyPair, CurrencyRate>
  for (const currency of currencies) {
    result[currency] = fallbackRates[currency]
  }
  return result
}

export async function getEurToUsd(): Promise<CurrencyRate> {
  const rates = await getCurrencyRates(['USD'])
  return rates.USD
}

export async function getEurToGbp(): Promise<CurrencyRate> {
  const rates = await getCurrencyRates(['GBP'])
  return rates.GBP
}

export async function getAllMajorRates(): Promise<CurrencyRate[]> {
  const currencies: CurrencyPair[] = ['USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD']
  const rates = await getCurrencyRates(currencies)

  return Object.values(rates)
}
