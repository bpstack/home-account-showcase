// AI limits (security review of 2026-11-19, finding 6): one limit per user whatever the provider,
// a global daily cap, values from the environment. The numbers come from those requirements and
// from the defaults chosen for Groq's free tier (1,000 a day): 15 per user per hour, 800 a day.
import { describe, expect, it } from 'vitest'
import {
  decideAIQuota,
  NO_LOCAL_USAGE,
  quotaMessage,
  readAILimits,
  type AIUsage,
  type LocalAIUsage,
} from './ai-quota.js'

const limits = { perUserPerHour: 15, globalPerDay: 800 }
const usage = (u: Partial<AIUsage> = {}): AIUsage => ({
  userLastHour: 0,
  oldestUserQuestionAgeSec: null,
  allLastDay: 0,
  ...u,
})
const local = (l: Partial<LocalAIUsage> = {}): LocalAIUsage => ({ ...NO_LOCAL_USAGE, ...l })

describe('limits from the environment', () => {
  it('uses 15 per user per hour and 800 a day by default', () => {
    expect(readAILimits({})).toEqual({ perUserPerHour: 15, globalPerDay: 800 })
  })

  it('takes valid values and ignores invalid ones', () => {
    expect(readAILimits({ AI_USER_LIMIT_PER_HOUR: '30', AI_GLOBAL_LIMIT_PER_DAY: '900' })).toEqual({
      perUserPerHour: 30,
      globalPerDay: 900,
    })
    expect(readAILimits({ AI_USER_LIMIT_PER_HOUR: '0', AI_GLOBAL_LIMIT_PER_DAY: 'mucho' })).toEqual(
      { perUserPerHour: 15, globalPerDay: 800 }
    )
    expect(readAILimits({ AI_USER_LIMIT_PER_HOUR: 'Infinity' }).perUserPerHour).toBe(15)
  })
})

describe('per user', () => {
  it('lets the 15th question through and stops the 16th', () => {
    expect(decideAIQuota(usage({ userLastHour: 14 }), local(), limits)).toEqual({
      allowed: true,
      remaining: 0,
    })
    expect(decideAIQuota(usage({ userLastHour: 15 }), local(), limits).allowed).toBe(false)
  })

  it('counts questions still in flight, so simultaneous requests cannot all pass', () => {
    expect(
      decideAIQuota(usage({ userLastHour: 13 }), local({ inFlightUser: 2, inFlightAll: 2 }), limits)
        .allowed
    ).toBe(false)
  })

  it('says when the oldest question of the hour expires', () => {
    const d = decideAIQuota(
      usage({ userLastHour: 15, oldestUserQuestionAgeSec: 3600 - 10 * 60 }),
      local(),
      limits
    )
    expect(d).toEqual({ allowed: false, reason: 'user', retryInMinutes: 10 })
  })
})

describe('deleting conversations does not free the quota', () => {
  it('still stops the 16th question when the stored ones were deleted', () => {
    const d = decideAIQuota(
      usage({ userLastHour: 0 }),
      local({ recentUser: 15, oldestRecentUserAgeSec: 60 }),
      limits
    )
    expect(d).toEqual({ allowed: false, reason: 'user', retryInMinutes: 59 })
  })

  it('keeps the global cap when stored questions were deleted', () => {
    expect(decideAIQuota(usage(), local({ recentAll: 800 }), limits).allowed).toBe(false)
  })
})

describe('global daily cap', () => {
  it('stops everyone once the day reaches 800 questions, even a user with room left', () => {
    const d = decideAIQuota(usage({ userLastHour: 0, allLastDay: 800 }), local(), limits)
    expect(d.allowed).toBe(false)
    expect(d).toMatchObject({ reason: 'global' })
  })
})

describe('messages', () => {
  it('tells the user the limit and the wait, in Spanish', () => {
    expect(quotaMessage({ allowed: false, reason: 'user', retryInMinutes: 10 }, limits)).toBe(
      'Has llegado al límite de 15 preguntas por hora. Podrás volver a preguntar en 10 minutos.'
    )
    expect(quotaMessage({ allowed: false, reason: 'user', retryInMinutes: 1 }, limits)).toMatch(
      /en 1 minuto\.$/
    )
    expect(
      quotaMessage(
        { allowed: false, reason: 'user', retryInMinutes: 5 },
        { perUserPerHour: 1, globalPerDay: 800 }
      )
    ).toMatch(/^Has llegado al límite de 1 pregunta por hora\./)
  })
})
