// middlewares/aiRateLimiter.ts
// Limits AI questions per user per hour and for everyone per day. The counts come from the stored
// chat questions, so they survive restarts and are shared by every instance. This instance also
// keeps its own log of the questions it let through, so deleting conversations does not free the
// quota; the larger of the two counts applies (services/ai/ai-quota.ts).

import { Request, Response, NextFunction } from 'express'
import { getActiveProvider } from '../services/ai/ai-client.js'
import {
  decideAIQuota,
  quotaMessage,
  readAILimits,
  usedThisHour,
  type LocalAIUsage,
} from '../services/ai/ai-quota.js'
import { InvestmentRepository } from '../repositories/investment/investment-repository.js'
import { logger } from '../utils/logger.js'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const inFlightByUser = new Map<string, number>()
let inFlightAll = 0
/** When this instance let each question through, per user (last hour) and for everyone (last day). */
const letThroughByUser = new Map<string, number[]>()
let letThroughAll: number[] = []

function prune(now: number): void {
  letThroughAll = letThroughAll.filter((t) => now - t < DAY_MS)
  for (const [userId, times] of letThroughByUser) {
    const recent = times.filter((t) => now - t < HOUR_MS)
    if (recent.length > 0) letThroughByUser.set(userId, recent)
    else letThroughByUser.delete(userId)
  }
}

function localUsage(userId: string, now: number): LocalAIUsage {
  prune(now)
  const recent = letThroughByUser.get(userId) ?? []
  return {
    inFlightUser: inFlightByUser.get(userId) ?? 0,
    inFlightAll,
    recentUser: recent.length,
    oldestRecentUserAgeSec: recent.length > 0 ? Math.floor((now - recent[0]) / 1000) : null,
    recentAll: letThroughAll.length,
  }
}

function recordLetThrough(userId: string, res: Response, now: number): void {
  letThroughByUser.set(userId, [...(letThroughByUser.get(userId) ?? []), now])
  letThroughAll.push(now)

  inFlightByUser.set(userId, (inFlightByUser.get(userId) ?? 0) + 1)
  inFlightAll++
  let released = false
  const release = () => {
    if (released) return
    released = true
    const left = (inFlightByUser.get(userId) ?? 1) - 1
    if (left > 0) inFlightByUser.set(userId, left)
    else inFlightByUser.delete(userId)
    inFlightAll = Math.max(0, inFlightAll - 1)
  }
  res.on('finish', release)
  res.on('close', release)
}

export function aiRateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (getActiveProvider() === 'none') return next()

    const userId = (req as any).user?.id
    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const now = Date.now()
    const limits = readAILimits(process.env)
    const usage = await InvestmentRepository.getChatUsage(userId)
    const decision = decideAIQuota(usage, localUsage(userId, now), limits)

    if (!decision.allowed) {
      logger.warn('AI_RATE_LIMITER', 'aiRateLimiter', `Limit reached (${decision.reason})`)
      res.status(429).json({ success: false, error: quotaMessage(decision, limits) })
      return
    }

    recordLetThrough(userId, res, now)
    next()
  }
}

/** The user's remaining questions this hour, for Settings > IA. */
export async function getAIRateLimitStatus(userId: string) {
  const now = Date.now()
  const limits = readAILimits(process.env)
  const usage = await InvestmentRepository.getChatUsage(userId)
  const local = localUsage(userId, now)
  const oldestAge = Math.max(
    usage.oldestUserQuestionAgeSec ?? -1,
    local.oldestRecentUserAgeSec ?? -1
  )

  return {
    provider: getActiveProvider(),
    remaining: Math.max(0, limits.perUserPerHour - usedThisHour(usage, local)),
    resetTime: oldestAge < 0 ? null : now + (3600 - oldestAge) * 1000,
    maxRequests: limits.perUserPerHour,
    isUnlimited: false,
  }
}
