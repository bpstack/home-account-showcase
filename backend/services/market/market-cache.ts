// services/market/market-cache.ts
// Cacheo de datos de mercado en base de datos

import db from '../../config/db.js'
import type { MarketDataContext, MarketCacheEntry } from './types.js'
import crypto from 'crypto'

const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutos
const CACHE_DURATION_SECONDS = 300

export async function getCachedMarketData(): Promise<MarketDataContext | null> {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT data, cached_at, expires_at
       FROM market_data_cache
       WHERE symbol = 'aggregate' AND source = 'multiple'
       AND expires_at > NOW()
       ORDER BY cached_at DESC
       LIMIT 1`
    )

    if (rows.length === 0) {
      console.log('[Market:Cache] No cached data found')
      return null
    }

    const cached = JSON.parse(rows[0].data)
    console.log(`[Market:Cache] Using cached data from ${rows[0].cached_at}`)

    return {
      ...cached,
      lastUpdated: rows[0].cached_at
    }
  } catch (error) {
    console.error('[Market:Cache] Error reading cache:', error)
    return null
  }
}

export async function cacheMarketData(data: MarketDataContext): Promise<void> {
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + CACHE_DURATION_MS)

  try {
    // Delete old cache entries for this symbol/source
    await db.query(
      `DELETE FROM market_data_cache WHERE symbol = 'aggregate' AND source = 'multiple'`
    )

    // Insert new cache
    await db.query(
      `INSERT INTO market_data_cache (id, symbol, source, data, cached_at, expires_at)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [id, 'aggregate', 'multiple', JSON.stringify(data), expiresAt]
    )

    console.log(`[Market:Cache] Cached market data, expires at ${expiresAt.toISOString()}`)
  } catch (error) {
    console.error('[Market:Cache] Error caching data:', error)
  }
}

export async function getCachedSymbol(
  symbol: string,
  source: string
): Promise<{ data: any; cachedAt: Date } | null> {
  try {
    const [rows] = await db.query<any[]>(
      `SELECT data, cached_at
       FROM market_data_cache
       WHERE symbol = ? AND source = ?
       AND expires_at > NOW()
       ORDER BY cached_at DESC
       LIMIT 1`,
      [symbol, source]
    )

    if (rows.length === 0) return null

    return {
      data: JSON.parse(rows[0].data),
      cachedAt: rows[0].cached_at
    }
  } catch (error) {
    console.error(`[Market:Cache] Error reading cache for ${symbol}/${source}:`, error)
    return null
  }
}

export async function cacheSymbol(
  symbol: string,
  source: string,
  data: any
): Promise<void> {
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + CACHE_DURATION_MS)

  try {
    await db.query(
      `DELETE FROM market_data_cache WHERE symbol = ? AND source = ?`,
      [symbol, source]
    )

    await db.query(
      `INSERT INTO market_data_cache (id, symbol, source, data, cached_at, expires_at)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [id, symbol, source, JSON.stringify(data), expiresAt]
    )
  } catch (error) {
    console.error(`[Market:Cache] Error caching ${symbol}/${source}:`, error)
  }
}

export async function clearExpiredCache(): Promise<number> {
  try {
    const [result] = await db.query<any>(
      `DELETE FROM market_data_cache WHERE expires_at < NOW()`
    )
    
    const deleted = (result as any).affectedRows
    if (deleted > 0) {
      console.log(`[Market:Cache] Cleared ${deleted} expired cache entries`)
    }
    
    return deleted
  } catch (error) {
    console.error('[Market:Cache] Error clearing expired cache:', error)
    return 0
  }
}

export async function getCacheStats(): Promise<{
  totalEntries: number
  expiredEntries: number
  validEntries: number
}> {
  try {
    const [totalRows] = await db.query<any[]>(
      `SELECT COUNT(*) as total FROM market_data_cache`
    )

    const [expiredRows] = await db.query<any[]>(
      `SELECT COUNT(*) as expired FROM market_data_cache WHERE expires_at < NOW()`
    )

    return {
      totalEntries: totalRows[0]?.total || 0,
      expiredEntries: expiredRows[0]?.expired || 0,
      validEntries: (totalRows[0]?.total || 0) - (expiredRows[0]?.expired || 0)
    }
  } catch (error) {
    console.error('[Market:Cache] Error getting stats:', error)
    return { totalEntries: 0, expiredEntries: 0, validEntries: 0 }
  }
}

export function getCacheDuration(): { ms: number; seconds: number; minutes: number } {
  return {
    ms: CACHE_DURATION_MS,
    seconds: CACHE_DURATION_SECONDS,
    minutes: CACHE_DURATION_MS / 60000
  }
}
