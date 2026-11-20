// Market figures (2026-11-19): a figure a source cannot give is shown as missing, never replaced by
// a made-up one; the economy is told with the period each figure belongs to. Expected values come
// from those requirements and from the shape of the real ECB and Eurostat answers, not from the
// code.
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./market-cache.js', () => ({
  readCache: vi.fn(),
  writeCache: vi.fn(),
  getCacheDuration: () => ({ ms: 300_000, seconds: 300, minutes: 5 }),
  PARTIAL_CACHE_DURATION_MS: 60_000,
  ECONOMY_CACHE_DURATION_MS: 43_200_000,
  ECONOMY_PARTIAL_CACHE_DURATION_MS: 3_600_000,
}))

const { getCryptoPrices } = await import('./coinGecko.js')
const { getCurrencyRates } = await import('./frankfurter.js')
const { fetchEconomy, parseEcb, parseEurostat } = await import('./economy.js')
const { buildMarketContext, buildMarketDataFull, isComplete } = await import('./index.js')
const { buildChatPrompt } = await import('../ai/prompts/chat-prompt.js')

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }))

const nothing = { crypto: {}, currencies: {} }
const now = new Date('2026-11-19T10:00:00.000Z')
const noEconomy = {
  inflationSpain: null,
  euribor12m: null,
  ecbDepositRate: null,
  unemploymentSpain: null,
}
type Economy = Parameters<typeof buildMarketDataFull>[0]['economy']
const context = (
  sources: Parameters<typeof buildMarketContext>[0],
  economy: Economy = noEconomy
) => ({
  ...buildMarketContext(sources, now),
  economy,
})

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
    const quotes = buildMarketContext(nothing, now)
    expect(quotes).toEqual({
      btc: null,
      eth: null,
      eurUsd: null,
      eurGbp: null,
      lastUpdated: '2026-11-19T10:00:00.000Z',
    })
    expect(isComplete(quotes)).toBe(false)
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
    const full = buildMarketDataFull(context(nothing))
    const figures = [
      ...full.cryptocurrencies.map((r) => [r.price, r.change24h]),
      ...full.currencies.map((r) => [r.rate, r.change24h]),
    ].flat()
    expect(figures).toHaveLength(8)
    expect(figures.every((f) => f === null)).toBe(true)
    expect(full.marketTrend).toBeNull()
  })

  it('dates the data when it was fetched, not when it is asked for', () => {
    expect(buildMarketDataFull(context(nothing)).cachedAt).toBe('2026-11-19T10:00:00.000Z')
  })

  it('takes the trend only from the changes that are known', () => {
    // One known rise of 1 %: the market is up. Counting the missing one as 0 would average
    // 0.5 % and call it flat
    const full = buildMarketDataFull(
      context({ ...nothing, crypto: { bitcoin: { value: 80000, change24h: 1 } } })
    )
    expect(full.marketTrend).toBe('alcista')
  })
})

describe('the chat', () => {
  const chatContext = (marketPrices: ReturnType<typeof context>) => ({
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
  const linesStarting = (prompt: string, start: RegExp) =>
    prompt.split('\n').filter((line) => start.test(line))
  const marketLines = (prompt: string) => linesStarting(prompt, /^- (Bitcoin|EUR\/USD):/)
  const economyLines = (prompt: string) =>
    linesStarting(prompt, /^- (Inflación|Euríbor|Tipo de depósito|Paro)/)

  it('is told a missing figure is not available, with no number standing in for it', () => {
    const lines = marketLines(buildChatPrompt('Hola', chatContext(context(nothing)), []))
    expect(lines).toHaveLength(2)
    for (const line of lines) {
      expect(line).toMatch(/: no disponible$/)
    }
  })

  it('is told the price with its change', () => {
    const prices = context({ ...nothing, crypto: { bitcoin: { value: 80000, change24h: 1.5 } } })
    expect(marketLines(buildChatPrompt('Hola', chatContext(prices), []))[0]).toBe(
      '- Bitcoin: 80.000,00 € (+1,50 %)'
    )
  })

  it('is told each economic figure with its period, and a missing one as not available', () => {
    const prices = context(nothing, {
      ...noEconomy,
      inflationSpain: { value: 4.9, period: '2026-10' },
    })
    expect(economyLines(buildChatPrompt('Hola', chatContext(prices), []))).toEqual([
      '- Inflación en España, interanual: 4,9 % (2026-10)',
      '- Euríbor a 12 meses, media mensual: no disponible',
      '- Tipo de depósito del BCE: no disponible',
      '- Paro en España: no disponible',
    ])
  })
})

describe('the economy', () => {
  // Shapes of the real answers, trimmed: ECB SDMX-JSON (detail=dataonly) and Eurostat JSON-stat
  const ecbAnswer = (values: number[], periods: string[]) => ({
    dataSets: [
      {
        series: {
          '0:0:0:0:0:0:0': {
            observations: Object.fromEntries(values.map((v, i) => [String(i), [v]])),
          },
        },
      },
    ],
    structure: {
      dimensions: { observation: [{ id: 'TIME_PERIOD', values: periods.map((id) => ({ id })) }] },
    },
  })
  const eurostatAnswer = (values: Record<string, number>, periods: string[]) => ({
    value: values,
    dimension: {
      time: { category: { index: Object.fromEntries(periods.map((p, i) => [p, i])) } },
    },
  })

  it('ECB: the last observation with its period', () => {
    expect(parseEcb(ecbAnswer([3.247, 3.2385909], ['2026-09', '2026-10']))).toEqual({
      value: 3.2385909,
      period: '2026-10',
    })
  })

  it('Eurostat: the last month with a value, when the newest month comes empty', () => {
    // Unemployment comes like this: the newest month is listed with no value yet
    expect(
      parseEurostat(eurostatAnswer({ '0': 10.2, '1': 10.3 }, ['2026-08', '2026-09', '2026-10']))
    ).toEqual({ value: 10.3, period: '2026-09' })
  })

  it('an answer without values gives no figure, not 0', () => {
    expect(parseEcb({})).toBeNull()
    expect(parseEurostat(eurostatAnswer({}, ['2026-10']))).toBeNull()
  })

  it('every indicator is null when the sources fail', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json({}, 503))
    )
    expect(await fetchEconomy()).toEqual(noEconomy)
  })

  it('reaches the market card as the sources gave it', () => {
    const economy = { ...noEconomy, ecbDepositRate: { value: 2.5, period: '2026-11-19' } }
    expect(buildMarketDataFull(context(nothing, economy)).economy).toEqual(economy)
  })
})
