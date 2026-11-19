// services/market/market-cache.ts
// Cacheo de datos de mercado en base de datos

import db from '../../config/db.js'
import type { MarketDataContext } from './types.js'
import crypto from 'crypto'
import { logger } from '../../utils/logger.js'

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutos
const CACHE_DURATION_SECONDS = 300
/** A result with gaps is kept only briefly, so a source that comes back shows up soon */
export const PARTIAL_CACHE_DURATION_MS = 60 * 1000

// The shape of the cached data changed with the removal of the fallback figures: rows written
// before carry the old one under 'aggregate' and are never read again
const CACHE_SYMBOL = 'aggregate-v2'
const CACHE_SOURCE = 'multiple'

export async function getCachedMarketData(): Promise<MarketDataContext | null> {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT data, cached_at, expires_at
       FROM market_data_cache
       WHERE symbol = ? AND source = ?
       AND expires_at > NOW()
       ORDER BY cached_at DESC
       LIMIT 1`,
      [CACHE_SYMBOL, CACHE_SOURCE]
    )

    if (rows.length === 0) {
      logger.info('MARKET_CACHE', 'getCachedMarketData', 'No cached data found')
      return null
    }

    const rawData = rows[0].data
    const cached = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
    logger.info(
      'MARKET_CACHE',
      'getCachedMarketData',
      `Using cached data from ${rows[0].cached_at}`
    )

    return cached
  } catch (error) {
    logger.error('MARKET_CACHE', 'getCachedMarketData', 'Error reading cache', error as Error)
    return null
  }
}

export async function cacheMarketData(
  data: MarketDataContext,
  durationMs: number = CACHE_DURATION_MS
): Promise<void> {
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + durationMs)

  try {
    // Also clears the rows of the old shape
    await db.query(`DELETE FROM market_data_cache WHERE source = ?`, [CACHE_SOURCE])

    await db.query(
      `INSERT INTO market_data_cache (id, symbol, source, data, cached_at, expires_at)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [id, CACHE_SYMBOL, CACHE_SOURCE, JSON.stringify(data), expiresAt]
    )

    logger.info(
      'MARKET_CACHE',
      'cacheMarketData',
      `Cached market data, expires at ${expiresAt.toISOString()}`
    )
  } catch (error) {
    logger.error('MARKET_CACHE', 'cacheMarketData', 'Error caching data', error as Error)
  }
}

export function getCacheDuration(): { ms: number; seconds: number; minutes: number } {
  return {
    ms: CACHE_DURATION_MS,
    seconds: CACHE_DURATION_SECONDS,
    minutes: CACHE_DURATION_MS / 60000,
  }
}
