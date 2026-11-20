// services/ai/chat-retention.ts
// Deletes old investment chat history (ADR-013): no message lives more than 7 days.

import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { logger } from '../../utils/logger.js'

export const CHAT_RETENTION_DAYS = 7

/** How often the purge runs while the server is up. It also runs once at startup. */
const PURGE_EVERY_MS = 6 * 60 * 60 * 1000

async function purge(): Promise<void> {
  try {
    const { messages, sessions } =
      await InvestmentRepository.purgeOldChatHistory(CHAT_RETENTION_DAYS)
    logger.info(
      'CHAT_RETENTION',
      'purge',
      `Deleted ${messages} messages older than ${CHAT_RETENTION_DAYS} days and ${sessions} empty conversations`
    )
  } catch (error) {
    // A failed purge must not take the server down: the next run tries again
    logger.error('CHAT_RETENTION', 'purge', 'Chat history purge failed', error as Error)
  }
}

/**
 * Runs the purge now and then every few hours. A sleeping server catches up when it wakes,
 * because each run deletes everything past the limit, not just the last interval.
 */
export function startChatRetention(): void {
  void purge()
  setInterval(() => void purge(), PURGE_EVERY_MS).unref()
}
