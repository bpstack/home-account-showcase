// services/market/economy.ts
// How the economy is doing, from official sources that are free and need no key: the ECB Data
// Portal and Eurostat. Each indicator is null when its source does not answer: never made up.

import type { Economy, Indicator } from './types.js'
import { logger } from '../../utils/logger.js'

const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data'
const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const TIMEOUT_MS = 10_000

const SOURCES = {
  // HICP annual rate for Spain; from 2026 Eurostat publishes it here (ECOICOP v2), not in
  // prc_hicp_manr, which stops at 2025-12
  inflationSpain: `${EUROSTAT_BASE}/prc_hicp_minr?geo=ES&unit=RCH_A&coicop18=TOTAL&lastTimePeriod=3`,
  // 12-month Euribor, monthly average
  euribor12m: `${ECB_BASE}/FM/M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA?lastNObservations=1&format=jsondata&detail=dataonly`,
  // ECB deposit facility rate, the one banks get for their deposits at the ECB
  ecbDepositRate: `${ECB_BASE}/FM/D.U2.EUR.4F.KR.DFR.LEV?lastNObservations=1&format=jsondata&detail=dataonly`,
  // Unemployment rate in Spain, seasonally adjusted; the last month can come empty
  unemploymentSpain: `${EUROSTAT_BASE}/une_rt_m?geo=ES&s_adj=SA&age=TOTAL&sex=T&unit=PC_ACT&lastTimePeriod=3`,
} as const

type SourceFormat = 'ecb' | 'eurostat'

const FORMAT: Record<keyof Economy, SourceFormat> = {
  inflationSpain: 'eurostat',
  euribor12m: 'ecb',
  ecbDepositRate: 'ecb',
  unemploymentSpain: 'eurostat',
}

/** The last observation of an ECB SDMX-JSON answer with a single series */
export function parseEcb(data: any): Indicator | null {
  const series = Object.values(data?.dataSets?.[0]?.series ?? {})[0] as
    | { observations?: Record<string, unknown[]> }
    | undefined
  const periods: { id: string }[] = data?.structure?.dimensions?.observation?.[0]?.values ?? []
  const observations = Object.entries(series?.observations ?? {})
    .map(([index, values]) => ({ period: periods[Number(index)]?.id, value: values?.[0] }))
    .filter(
      (o): o is { period: string; value: number } =>
        typeof o.period === 'string' && typeof o.value === 'number' && Number.isFinite(o.value)
    )
    .sort((a, b) => a.period.localeCompare(b.period))
  return observations.at(-1) ?? null
}

/** The last month with a value of a Eurostat JSON-stat answer filtered to a single series */
export function parseEurostat(data: any): Indicator | null {
  const months: Record<string, number> = data?.dimension?.time?.category?.index ?? {}
  const values: Record<string, unknown> = data?.value ?? {}
  const observations = Object.entries(months)
    .map(([period, index]) => ({ period, value: values[String(index)] }))
    .filter(
      (o): o is { period: string; value: number } =>
        typeof o.value === 'number' && Number.isFinite(o.value)
    )
    .sort((a, b) => a.period.localeCompare(b.period))
  return observations.at(-1) ?? null
}

async function getIndicator(key: keyof Economy): Promise<Indicator | null> {
  const startTime = Date.now()
  try {
    const response = await fetch(SOURCES[key], {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      logger.warn('ECONOMY', 'getIndicator', `${key}: API error ${response.status}`)
      return null
    }
    const data = await response.json()
    const indicator = FORMAT[key] === 'ecb' ? parseEcb(data) : parseEurostat(data)
    if (!indicator) logger.warn('ECONOMY', 'getIndicator', `${key}: no value in the answer`)
    else logger.info('ECONOMY', 'getIndicator', `${key} in ${Date.now() - startTime}ms`)
    return indicator
  } catch (error) {
    logger.warn(
      'ECONOMY',
      'getIndicator',
      `${key}: ${(error as Error).name} after ${Date.now() - startTime}ms`
    )
    return null
  }
}

export async function fetchEconomy(): Promise<Economy> {
  const [inflationSpain, euribor12m, ecbDepositRate, unemploymentSpain] = await Promise.all([
    getIndicator('inflationSpain'),
    getIndicator('euribor12m'),
    getIndicator('ecbDepositRate'),
    getIndicator('unemploymentSpain'),
  ])
  return { inflationSpain, euribor12m, ecbDepositRate, unemploymentSpain }
}
