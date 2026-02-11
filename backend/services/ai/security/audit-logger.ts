// services/ai/security/audit-logger.ts
// Security Audit Logging for AI interactions

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../../../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Log file location
const LOG_DIR = path.join(__dirname, '../../../logs')
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'ai-security.log')

export type SecurityEventType =
  | 'prompt_injection_blocked'
  | 'suspicious_input'
  | 'unsafe_output_detected'
  | 'blocked_user_attempt'
  | 'rate_limit_exceeded'
  | 'jailbreak_attempt'
  | 'data_extraction_attempt'
  | 'unusual_pattern'

export interface SecurityEvent {
  type: SecurityEventType
  userId: string
  timestamp?: Date
  input?: string
  sanitizedInput?: string
  output?: string
  details?: string
  threatLevel?: string
  endpoint?: string
  sessionId?: string
  ip?: string
  userAgent?: string
}

// In-memory buffer for batch writing
const eventBuffer: SecurityEvent[] = []
const BUFFER_FLUSH_INTERVAL = 10000 // 10 seconds
const BUFFER_MAX_SIZE = 50

// Ensure log directory exists
function ensureLogDirectory(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
  } catch (error) {
    logger.error('AI_AUDIT', 'ensureLogDirectory', 'Failed to create log directory', error as Error)
  }
}

/**
 * Log a security event
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  }

  // Add to buffer
  eventBuffer.push(fullEvent)

  // Log for immediate visibility
  logger.warn('AI_AUDIT', 'logSecurityEvent', `Security event: ${event.type}`, {
    userId: event.userId,
    threatLevel: event.threatLevel,
    details: event.details?.substring(0, 100),
  })

  // Flush if buffer is full
  if (eventBuffer.length >= BUFFER_MAX_SIZE) {
    await flushEventBuffer()
  }
}

/**
 * Flush event buffer to file
 */
async function flushEventBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return

  ensureLogDirectory()

  const events = eventBuffer.splice(0, eventBuffer.length)
  const logLines = events.map(event => JSON.stringify(event)).join('\n') + '\n'

  try {
    fs.appendFileSync(SECURITY_LOG_FILE, logLines, 'utf-8')
  } catch (error) {
    logger.error('AI_AUDIT', 'flushEventBuffer', 'Failed to write to log file', error as Error)
    eventBuffer.unshift(...events)
  }
}

// Periodic flush
setInterval(flushEventBuffer, BUFFER_FLUSH_INTERVAL)

// Flush on process exit
process.on('beforeExit', () => {
  flushEventBuffer()
})

/**
 * Get security events for a user
 */
export async function getUserSecurityEvents(
  userId: string,
  limit: number = 100
): Promise<SecurityEvent[]> {
  ensureLogDirectory()

  if (!fs.existsSync(SECURITY_LOG_FILE)) {
    return []
  }

  try {
    const content = fs.readFileSync(SECURITY_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const events: SecurityEvent[] = []
    for (const line of lines.slice(-1000)) { // Only check last 1000 lines
      try {
        const event = JSON.parse(line) as SecurityEvent
        if (event.userId === userId) {
          events.push(event)
        }
      } catch {
        // Skip invalid lines
      }
    }

    return events.slice(-limit)
  } catch (error) {
    logger.error('AI_AUDIT', 'getUserSecurityEvents', 'Failed to read security events', error as Error)
    return []
  }
}

/**
 * Get security statistics
 */
export async function getSecurityStats(
  timeWindowMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<{
  totalEvents: number
  byType: Record<SecurityEventType, number>
  byThreatLevel: Record<string, number>
  uniqueUsers: number
  topOffenders: Array<{ userId: string; count: number }>
}> {
  ensureLogDirectory()

  const stats = {
    totalEvents: 0,
    byType: {} as Record<SecurityEventType, number>,
    byThreatLevel: {} as Record<string, number>,
    uniqueUsers: 0,
    topOffenders: [] as Array<{ userId: string; count: number }>,
  }

  if (!fs.existsSync(SECURITY_LOG_FILE)) {
    return stats
  }

  const cutoffTime = Date.now() - timeWindowMs
  const userCounts: Record<string, number> = {}

  try {
    const content = fs.readFileSync(SECURITY_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const event = JSON.parse(line) as SecurityEvent
        const eventTime = new Date(event.timestamp || 0).getTime()

        if (eventTime < cutoffTime) continue

        stats.totalEvents++

        // Count by type
        stats.byType[event.type] = (stats.byType[event.type] || 0) + 1

        // Count by threat level
        if (event.threatLevel) {
          stats.byThreatLevel[event.threatLevel] =
            (stats.byThreatLevel[event.threatLevel] || 0) + 1
        }

        // Count by user
        userCounts[event.userId] = (userCounts[event.userId] || 0) + 1
      } catch {
        // Skip invalid lines
      }
    }

    stats.uniqueUsers = Object.keys(userCounts).length

    // Top offenders
    stats.topOffenders = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return stats
  } catch (error) {
    logger.error('AI_AUDIT', 'getSecurityStats', 'Failed to calculate stats', error as Error)
    return stats
  }
}

/**
 * Clean old log entries
 */
export async function cleanOldSecurityLogs(
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<number> {
  ensureLogDirectory()

  if (!fs.existsSync(SECURITY_LOG_FILE)) {
    return 0
  }

  const cutoffTime = Date.now() - maxAgeMs
  let removedCount = 0

  try {
    const content = fs.readFileSync(SECURITY_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    const validLines: string[] = []
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as SecurityEvent
        const eventTime = new Date(event.timestamp || 0).getTime()

        if (eventTime >= cutoffTime) {
          validLines.push(line)
        } else {
          removedCount++
        }
      } catch {
        // Keep invalid lines (might be important)
        validLines.push(line)
      }
    }

    if (removedCount > 0) {
      fs.writeFileSync(SECURITY_LOG_FILE, validLines.join('\n') + '\n', 'utf-8')
      logger.info('AI_AUDIT', 'cleanOldSecurityLogs', `Cleaned ${removedCount} old log entries`)
    }

    return removedCount
  } catch (error) {
    logger.error('AI_AUDIT', 'cleanOldSecurityLogs', 'Failed to clean old logs', error as Error)
    return 0
  }
}

// Run cleanup daily
setInterval(() => cleanOldSecurityLogs(), 24 * 60 * 60 * 1000)
