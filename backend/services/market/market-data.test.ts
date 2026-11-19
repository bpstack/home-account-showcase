// Market figures (2026-11-19): a figure a source cannot give is shown as missing, never replaced by
// a made-up one. Expected values come from that requirement, not from the code.
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./market-cache.js', () => ({
  getCachedMarketData: vi.fn(),
  cacheMarketData: vi.fn(),
  getCacheDuration: () => ({ ms: 300_000, seconds: 300, minutes: 5 }),
  PARTIAL_CACHE_DURATION_MS: 60_000,
}))

const { getCryptoPrices } = await import('./coinGecko.js')
const { getCurrencyRates } = await import('./frankfurter.js')
const { buildMarketContext, buildMarketDataFull, isComplete } = await import('./index.js')
const { buildChatPrompt } = await import('../ai/prompts/chat-prompt.js')

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

const nothing = { crypto: {}, currencies: {} }
const now = new Date('2026-11-19T10:00:00.000Z')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a source that fails gives no figure', () => {
  for (const [label, fail] of [
    ['network error', () => Promise.reject(new Error('offline'))],
    ['HTTP 429', () => json({}, 429)],
    ['HTTP 500', () => json({}, 500)],
  ] as const) {
    it(`CoinGecko and Frankfurter, on ${label}`, async () => {
      vi.stubGlobal('fetch', vi.fn(fail))
      expect(await getCryptoPrices(['bitcoin', 'ethereum'])).toEqual({})
      expect(await getCurrencyRates(['USD', 'GBP'])).toEqual({})
    })
  }

  it('every figure is null and the data counts as incomplete', () => {
    const context = buildMarketContext(nothing, now)
    expect(context).toEqual({
      btc: null,
      eth: null,
      eurUsd: null,
      eurGbp: null,
      lastUpdated: '2026-11-19T10:00:00.000Z',
    })
    expect(isComplete(context)).toBe(false)
  })
})

describe('what the sources give', () => {
  it('CoinGecko: a coin without its change keeps the price and leaves the change unknown', async () => {
    vi.stubGlobal('fetch', () =>
      json({ bitcoin: { eur: 80000, eur_24h_change: 1.5 }, ethereum: { eur: 3000 } })
    )
    expect(await getCryptoPrices(['bitcoin', 'ethereum'])).toEqual({
      bitcoin: { value: 80000, change24h: 1.5 },
      ethereum: { value: 3000, change24h: null },
    })
  })

  it('Frankfurter: the last published rate and its change from the working day before', async () => {
    vi.stubGlobal('fetch', () =>
      json({
        rates: {
          '2026-11-13': { USD: 1.0, GBP: 0.8 },
          '2026-11-16': { USD: 1.1, GBP: 0.8 },
        },
      })
    )
    const rates = await getCurrencyRates(['USD', 'GBP'])
    expect(rates.USD?.value).toBe(1.1)
    expect(rates.USD?.change24h).toBeCloseTo(10)
    expect(rates.GBP).toEqual({ value: 0.8, change24h: 0 })
  })

  it('Frankfurter: with a single day published, the change is unknown, not 0', async () => {
    vi.stubGlobal('fetch', () => json({ rates: { '2026-11-16': { USD: 1.1 } } }))
    expect(await getCurrencyRates(['USD'])).toEqual({ USD: { value: 1.1, change24h: null } })
  })
})

describe('the market card', () => {
  it('keeps every row, with no figure where the source did not answer', () => {
    const full = buildMarketDataFull(buildMarketContext(nothing, now))
    const figures = [
      ...full.cryptocurrencies.map((r) => [r.price, r.change24h]),
      ...full.currencies.map((r) => [r.rate, r.change24h]),
    ].flat()
    expect(figures).toHaveLength(8)
    expect(figures.every((f) => f === null)).toBe(true)
    expect(full.marketTrend).toBeNull()
  })

  it('dates the data when it was fetched, not when it is asked for', () => {
    expect(buildMarketDataFull(buildMarketContext(nothing, now)).cachedAt).toBe(
      '2026-11-19T10:00:00.000Z'
    )
  })

  it('takes the trend only from the changes that are known', () => {
    // One known rise of 1 %: the market is up. Counting the missing one as 0 would average
    // 0.5 % and call it flat
    const context = buildMarketContext(
      { ...nothing, crypto: { bitcoin: { value: 80000, change24h: 1 } } },
      now
    )
    expect(buildMarketDataFull(context).marketTrend).toBe('alcista')
  })
})

describe('the chat', () => {
  const chatContext = (marketPrices: ReturnType<typeof buildMarketContext>) => ({
    accountId: 'account-1',
    financialSummary: {
      avgMonthlyIncome: 2000,
      savingsCapacity: 400,
      savingsRate: 20,
      emergencyFundCurrent: 3000,
      emergencyFundGoal: 6000,
      historicalMonths: 12,
      trend: 'stable' as const,
    },
    marketPrices,
  })
  const marketLines = (prompt: string) =>
    prompt.split('\n').filter((line) => /^- (Bitcoin|EUR\/USD):/.test(line))

  it('is told a missing figure is not available, with no number standing in for it', () => {
    const lines = marketLines(
      buildChatPrompt('Hola', chatContext(buildMarketContext(nothing, now)), [])
    )
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(line).toMatch(/: no disponible$/)
    }
  })

  it('is told the price with its change', () => {
    const context = buildMarketContext(
      { ...nothing, crypto: { bitcoin: { value: 80000, change24h: 1.5 } } },
      now
    )
    expect(marketLines(buildChatPrompt('Hola', chatContext(context), []))[0]).toBe(
      '- Bitcoin: 80.000,00 € (+1,50 %)'
    )
  })
})
