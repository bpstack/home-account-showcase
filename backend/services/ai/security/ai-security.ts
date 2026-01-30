// services/ai/security/ai-security.ts
// Comprehensive AI Security Service

import { detectPromptInjection, sanitizeUserInput, type ThreatAnalysis } from './prompt-guard.js'
import { validateAIOutput, type OutputValidation } from './output-validator.js'
import { logSecurityEvent, type SecurityEventType } from './audit-logger.js'

export interface SecurityCheckResult {
  allowed: boolean
  sanitizedInput: string
  threats: ThreatAnalysis
  blocked: boolean
  blockReason?: string
}

export interface OutputSecurityResult {
  safe: boolean
  sanitizedOutput: string
  issues: string[]
  blocked: boolean
}

// Threshold for blocking user (too many suspicious attempts)
const SUSPICIOUS_ATTEMPT_THRESHOLD = 5
const SUSPICIOUS_WINDOW_MS = 60 * 60 * 1000 // 1 hour

// Track suspicious attempts per user
const suspiciousAttempts = new Map<string, { count: number; firstAttempt: number }>()

/**
 * Check if user is temporarily blocked due to suspicious activity
 */
function isUserBlocked(userId: string): boolean {
  const attempts = suspiciousAttempts.get(userId)
  if (!attempts) return false

  const now = Date.now()
  if (now - attempts.firstAttempt > SUSPICIOUS_WINDOW_MS) {
    // Window expired, reset
    suspiciousAttempts.delete(userId)
    return false
  }

  return attempts.count >= SUSPICIOUS_ATTEMPT_THRESHOLD
}

/**
 * Record a suspicious attempt
 */
function recordSuspiciousAttempt(userId: string): void {
  const now = Date.now()
  const attempts = suspiciousAttempts.get(userId)

  if (!attempts || now - attempts.firstAttempt > SUSPICIOUS_WINDOW_MS) {
    suspiciousAttempts.set(userId, { count: 1, firstAttempt: now })
  } else {
    attempts.count++
  }
}

/**
 * Main security check for user input before sending to AI
 */
export async function checkInputSecurity(
  userId: string,
  input: string,
  context?: { endpoint?: string; sessionId?: string }
): Promise<SecurityCheckResult> {
  // Check if user is blocked
  if (isUserBlocked(userId)) {
    await logSecurityEvent({
      type: 'blocked_user_attempt',
      userId,
      input: input.substring(0, 100),
      details: 'User blocked due to repeated suspicious activity',
      endpoint: context?.endpoint,
    })

    return {
      allowed: false,
      sanitizedInput: '',
      threats: { hasThreat: true, threatLevel: 'critical', patterns: ['user_blocked'], score: 100 },
      blocked: true,
      blockReason: 'Has realizado demasiados intentos sospechosos. Intenta más tarde.',
    }
  }

  // Analyze input for threats
  const threats = detectPromptInjection(input)

  // If critical threat, block and record
  if (threats.threatLevel === 'critical') {
    recordSuspiciousAttempt(userId)

    await logSecurityEvent({
      type: 'prompt_injection_blocked',
      userId,
      input: input.substring(0, 200),
      details: `Critical threat detected: ${threats.patterns.join(', ')}`,
      endpoint: context?.endpoint,
      sessionId: context?.sessionId,
    })

    return {
      allowed: false,
      sanitizedInput: '',
      threats,
      blocked: true,
      blockReason: 'Tu mensaje contiene patrones no permitidos. Por favor, reformula tu pregunta.',
    }
  }

  // Sanitize input
  const sanitizedInput = sanitizeUserInput(input)

  // Log if any threats detected (even if allowed)
  if (threats.hasThreat) {
    recordSuspiciousAttempt(userId)

    await logSecurityEvent({
      type: 'suspicious_input',
      userId,
      input: input.substring(0, 200),
      sanitizedInput: sanitizedInput.substring(0, 200),
      details: `Threats detected: ${threats.patterns.join(', ')}`,
      threatLevel: threats.threatLevel,
      endpoint: context?.endpoint,
      sessionId: context?.sessionId,
    })
  }

  return {
    allowed: true,
    sanitizedInput,
    threats,
    blocked: false,
  }
}

/**
 * Validate AI output before returning to user
 */
export async function checkOutputSecurity(
  userId: string,
  output: string,
  sensitivePatterns?: string[]
): Promise<OutputSecurityResult> {
  const validation = validateAIOutput(output, sensitivePatterns)

  if (!validation.safe) {
    await logSecurityEvent({
      type: 'unsafe_output_detected',
      userId,
      details: `Output issues: ${validation.issues.join(', ')}`,
    })
  }

  return {
    safe: validation.safe,
    sanitizedOutput: validation.sanitizedOutput,
    issues: validation.issues,
    blocked: validation.blocked,
  }
}

/**
 * Get security status for a user
 */
export function getUserSecurityStatus(userId: string): {
  blocked: boolean
  suspiciousAttempts: number
  remainingAttempts: number
  blockedUntil?: Date
} {
  const attempts = suspiciousAttempts.get(userId)

  if (!attempts) {
    return {
      blocked: false,
      suspiciousAttempts: 0,
      remainingAttempts: SUSPICIOUS_ATTEMPT_THRESHOLD,
    }
  }

  const now = Date.now()
  if (now - attempts.firstAttempt > SUSPICIOUS_WINDOW_MS) {
    return {
      blocked: false,
      suspiciousAttempts: 0,
      remainingAttempts: SUSPICIOUS_ATTEMPT_THRESHOLD,
    }
  }

  const blocked = attempts.count >= SUSPICIOUS_ATTEMPT_THRESHOLD
  return {
    blocked,
    suspiciousAttempts: attempts.count,
    remainingAttempts: Math.max(0, SUSPICIOUS_ATTEMPT_THRESHOLD - attempts.count),
    blockedUntil: blocked ? new Date(attempts.firstAttempt + SUSPICIOUS_WINDOW_MS) : undefined,
  }
}

/**
 * Clear user's suspicious attempts (admin function)
 */
export function clearUserSuspiciousAttempts(userId: string): void {
  suspiciousAttempts.delete(userId)
}

/**
 * Cleanup expired entries periodically
 */
export function cleanupExpiredSecurityData(): void {
  const now = Date.now()
  for (const [userId, attempts] of suspiciousAttempts.entries()) {
    if (now - attempts.firstAttempt > SUSPICIOUS_WINDOW_MS) {
      suspiciousAttempts.delete(userId)
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupExpiredSecurityData, 30 * 60 * 1000)
