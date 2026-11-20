// services/market/market-cache.ts
// Cacheo de datos de mercado en base de datos: una fila por clave, que se reescribe al caducar

import db from '../../config/db.js'
import crypto from 'crypto'
import { logger } from '../../utils/logger.js'

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutos
const CACHE_DURATION_SECONDS = 300
/** A result with gaps is kept only briefly, so a source that comes back shows up soon */
export const PARTIAL_CACHE_DURATION_MS = 60 * 1000
/** Economic indicators are monthly or change a few times a year */
export const ECONOMY_CACHE_DURATION_MS = 12 * 60 * 60 * 1000
export const ECONOMY_PARTIAL_CACHE_DURATION_MS = 60 * 60 * 1000

const CACHE_SOURCE = 'multiple'

/**
 * The cached keys. The shape of the quotes changed with the removal of the fallback figures:
 * rows written before carry the old one under 'aggregate' and are never read again
 */
export type CacheKey = 'aggregate-v2' | 'economy'

export async function readCache<T>(key: CacheKey): Promise<T | null> {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT data, cached_at
       FROM market_data_cache
       WHERE symbol = ? AND source = ?
       AND expires_at > NOW()
       LIMIT 1`,
      [key, CACHE_SOURCE]
    )

    if (rows.length === 0) {
      logger.info('MARKET_CACHE', 'readCache', `No cached ${key}`)
      return null
    }

    const rawData = rows[0].data
    logger.info('MARKET_CACHE', 'readCache', `Using cached ${key}`)
    return typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  } catch (error) {
    logger.error('MARKET_CACHE', 'readCache', `Error reading ${key}`, error as Error)
    return null
  }
}

export async function writeCache(key: CacheKey, data: unknown, durationMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMs)

  try {
    // One statement: two requests that miss the cache at once both write, and the last one wins,
    // where a DELETE and an INSERT made the second fail on the unique key
    await db.query(
      `INSERT INTO market_data_cache (id, symbol, source, data, cached_at, expires_at)
       VALUES (?, ?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE data = ?, cached_at = NOW(), expires_at = ?`,
      [
        crypto.randomUUID(),
        key,
        CACHE_SOURCE,
        JSON.stringify(data),
        expiresAt,
        JSON.stringify(data),
        expiresAt,
      ]
    )

    logger.info('MARKET_CACHE', 'writeCache', `Cached ${key} until ${expiresAt.toISOString()}`)
  } catch (error) {
    logger.error('MARKET_CACHE', 'writeCache', `Error caching ${key}`, error as Error)
  }
}

export function getCacheDuration(): { ms: number; seconds: number; minutes: number } {
  return {
    ms: CACHE_DURATION_MS,
    seconds: CACHE_DURATION_SECONDS,
    minutes: CACHE_DURATION_MS / 60000,
  }
}
