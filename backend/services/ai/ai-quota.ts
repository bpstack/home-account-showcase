// services/ai/ai-quota.ts
// How many AI questions are allowed. Pure logic, free of DB imports so it can be tested alone;
// the counts come from the stored chat messages (see InvestmentRepository.getChatUsage), so they
// survive restarts and are shared by every server instance.

export interface AILimits {
  /** Questions one user can ask per hour, whatever the provider. */
  perUserPerHour: number
  /** Questions all users together can ask per day: a cap on what the provider bills or allows. */
  globalPerDay: number
}

export const DEFAULT_AI_LIMITS: AILimits = { perUserPerHour: 15, globalPerDay: 800 }

const positiveInt = (value: string | undefined, fallback: number): number => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/** Limits from the environment, falling back to the defaults on a missing or invalid value. */
export function readAILimits(env: Record<string, string | undefined>): AILimits {
  return {
    perUserPerHour: positiveInt(env.AI_USER_LIMIT_PER_HOUR, DEFAULT_AI_LIMITS.perUserPerHour),
    globalPerDay: positiveInt(env.AI_GLOBAL_LIMIT_PER_DAY, DEFAULT_AI_LIMITS.globalPerDay),
  }
}

export interface AIUsage {
  /** The user's questions stored in the last hour. */
  userLastHour: number
  /** Seconds since the oldest of those questions, or null if there are none. */
  oldestUserQuestionAgeSec: number | null
  /** Questions stored by everyone in the last day. */
  allLastDay: number
}

/**
 * What this server instance has seen itself: questions let through but not stored yet (in
 * flight), and every question it let through in the last hour/day. Deleting a conversation
 * removes its questions from the stored counts, so the local log keeps the limit honest until a
 * restart; after a restart the stored counts do. The larger of the two always applies.
 */
export interface LocalAIUsage {
  inFlightUser: number
  inFlightAll: number
  /** Questions this instance let through for the user in the last hour. */
  recentUser: number
  /** Seconds since the oldest of those, or null. */
  oldestRecentUserAgeSec: number | null
  /** Questions this instance let through for everyone in the last day. */
  recentAll: number
}

export const NO_LOCAL_USAGE: LocalAIUsage = {
  inFlightUser: 0,
  inFlightAll: 0,
  recentUser: 0,
  oldestRecentUserAgeSec: null,
  recentAll: 0,
}

export type AIQuotaDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'user' | 'global'; retryInMinutes: number }

/** Questions the user has used this hour, by the larger of the stored and the local count. */
export function usedThisHour(usage: AIUsage, local: LocalAIUsage): number {
  return Math.max(usage.userLastHour + local.inFlightUser, local.recentUser)
}

/** Whether one more question fits. */
export function decideAIQuota(
  usage: AIUsage,
  local: LocalAIUsage,
  limits: AILimits
): AIQuotaDecision {
  const usedToday = Math.max(usage.allLastDay + local.inFlightAll, local.recentAll)
  if (usedToday >= limits.globalPerDay) {
    return { allowed: false, reason: 'global', retryInMinutes: 60 }
  }
  const used = usedThisHour(usage, local)
  if (used >= limits.perUserPerHour) {
    const age = Math.max(usage.oldestUserQuestionAgeSec ?? 0, local.oldestRecentUserAgeSec ?? 0)
    return {
      allowed: false,
      reason: 'user',
      retryInMinutes: Math.max(1, Math.ceil((3600 - age) / 60)),
    }
  }
  return { allowed: true, remaining: limits.perUserPerHour - used - 1 }
}

/** What the user is told when a question does not fit. */
export function quotaMessage(
  decision: Extract<AIQuotaDecision, { allowed: false }>,
  limits: AILimits
): string {
  if (decision.reason === 'global') {
    return 'El asistente ha llegado a su límite de uso diario. Inténtalo más tarde.'
  }
  const minutes = decision.retryInMinutes
  const max = limits.perUserPerHour
  return `Has llegado al límite de ${max} ${max === 1 ? 'pregunta' : 'preguntas'} por hora. Podrás volver a preguntar en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
}
