// middlewares/aiRateLimiter.ts
// Rate limiter for AI providers with per-provider limits

import { Request, Response, NextFunction } from 'express'
import { getActiveProvider } from '../services/ai/ai-client.js'
import type { AIProviderType } from '../services/ai/types.js'
import { logger } from '../utils/logger.js'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store per user per provider
const rateLimitStore = new Map<string, RateLimitEntry>()

// Track recent parse operations for parse+categorize combo
const recentParseStore = new Map<string, number>()
const PARSE_CATEGORIZE_WINDOW_MS = 60 * 1000 // 60 seconds

const WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Limits per provider (per hour)
const PROVIDER_LIMITS: Record<AIProviderType, number> = {
  ollama: Infinity, // Unlimited (local)
  groq: 15,
  claude: 5,
  gemini: 5,
  none: 0,
}

/**
 * Get the effective provider that will be used
 * No fallback - respects user selection
 */
function getEffectiveProvider(): AIProviderType {
  return getActiveProvider()
}

/**
 * Get rate limit key for a user and provider
 */
function getRateLimitKey(userId: string, provider: AIProviderType): string {
  return `ai_rate_${provider}_${userId}`
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(
  userId: string,
  provider: AIProviderType
): {
  allowed: boolean
  remaining: number
  resetTime: number | null
  limit: number
} {
  const limit = PROVIDER_LIMITS[provider]

  // Unlimited providers always allowed
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, resetTime: null, limit: Infinity }
  }

  const key = getRateLimitKey(userId, provider)
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // No entry or expired - create new window
  if (!entry || now > entry.resetTime) {
    return { allowed: true, remaining: limit - 1, resetTime: now + WINDOW_MS, limit }
  }

  // Check if within limit
  if (entry.count < limit) {
    return { allowed: true, remaining: limit - entry.count - 1, resetTime: entry.resetTime, limit }
  }

  // Rate limited
  return { allowed: false, remaining: 0, resetTime: entry.resetTime, limit }
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(userId: string, provider: AIProviderType): void {
  const limit = PROVIDER_LIMITS[provider]
  if (limit === Infinity) return

  const key = getRateLimitKey(userId, provider)
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + WINDOW_MS })
  } else {
    entry.count++
  }
}

/**
 * Mark a parse operation for parse+categorize combo tracking
 */
export function markParseOperation(userId: string): void {
  recentParseStore.set(`parse_${userId}`, Date.now())
}

/**
 * Check if categorize should be free (recent parse exists)
 */
function isCategorizeAfterParse(userId: string): boolean {
  const parseTime = recentParseStore.get(`parse_${userId}`)
  if (!parseTime) return false

  const elapsed = Date.now() - parseTime
  if (elapsed < PARSE_CATEGORIZE_WINDOW_MS) {
    // Clear the parse marker so it can only be used once
    recentParseStore.delete(`parse_${userId}`)
    return true
  }

  return false
}

/**
 * Main rate limiter middleware
 * Options:
 * - skipRateLimit: true to skip (for test endpoint)
 * - isCategorize: true for categorize endpoint (check parse combo)
 * - isParse: true for parse endpoint (mark for combo)
 */
export function aiRateLimiter(
  options: {
    skipRateLimit?: boolean
    isParse?: boolean
    isCategorize?: boolean
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip if explicitly disabled
    if (options.skipRateLimit) {
      return next()
    }

    const userId = (req as any).user?.id || 'anonymous'
    const provider = getEffectiveProvider()

    // No provider configured
    if (provider === 'none') {
      return next()
    }

    // Categorize after parse is free
    if (options.isCategorize && isCategorizeAfterParse(userId)) {
      logger.info(
        'AI_RATE_LIMITER',
        'aiRateLimiter',
        `Categorize free (after parse) for user ${userId}`
      )
      return next()
    }

    const { allowed, remaining, resetTime, limit } = checkRateLimit(userId, provider)

    if (!allowed) {
      const timeRemaining = Math.ceil((resetTime! - Date.now()) / 60000)
      res.status(429).json({
        success: false,
        error: `${provider.toUpperCase()} request limit exceeded`,
        message: `You have reached the limit of ${limit} requests per hour. Try again in ${timeRemaining} minutes.`,
        remaining: 0,
        resetTime,
        provider,
      })
      return
    }

    incrementRateLimit(userId, provider)

    if (options.isParse) {
      markParseOperation(userId)
    }

    logger.info(
      'AI_RATE_LIMITER',
      'aiRateLimiter',
      `${provider}: ${remaining}/${limit} remaining for user ${userId}`
    )

    next()
  }
}

/**
 * Get rate limit status for a user across all providers
 */
export function getAIRateLimitStatus(userId: string = 'anonymous') {
  const provider = getEffectiveProvider()
  const limit = PROVIDER_LIMITS[provider]

  if (limit === Infinity) {
    return {
      provider,
      remaining: Infinity,
      resetTime: null,
      maxRequests: Infinity,
      isUnlimited: true,
    }
  }

  const key = getRateLimitKey(userId, provider)
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    return {
      provider,
      remaining: limit,
      resetTime: null,
      maxRequests: limit,
      isUnlimited: false,
    }
  }

  return {
    provider,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
    maxRequests: limit,
    isUnlimited: false,
  }
}

/**
 * Get all provider limits (for frontend display)
 */
export function getProviderLimits(): Record<AIProviderType, number | 'unlimited'> {
  return {
    ollama: 'unlimited',
    groq: PROVIDER_LIMITS.groq,
    claude: PROVIDER_LIMITS.claude,
    gemini: PROVIDER_LIMITS.gemini,
    none: 0,
  }
}

/**
 * Cleanup expired entries (run periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }

  // Clean old parse markers
  for (const [key, time] of recentParseStore.entries()) {
    if (now - time > PARSE_CATEGORIZE_WINDOW_MS) {
      recentParseStore.delete(key)
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000)
