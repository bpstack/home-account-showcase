// services/ai/ai-errors.ts
// What the client is told when the AI provider fails. The provider's own message and status stay
// in the server log: they name the provider, its quota and its configuration, and a provider 401
// ("invalid API key") must never reach the browser as a 401, which reads as an expired session.

import { AppError } from '../../utils/app-error.js'

export const AI_UNAVAILABLE_MESSAGE =
  'El servicio de IA no está disponible ahora mismo. Inténtalo más tarde.'
export const AI_BUSY_MESSAGE =
  'La IA está saturada en este momento. Inténtalo dentro de unos minutos.'
export const AI_TIMEOUT_MESSAGE = 'La IA ha tardado demasiado en responder. Inténtalo de nuevo.'

const statusOf = (error: unknown): number | undefined =>
  error instanceof AppError ? error.statusCode : undefined

/** A provider failure turned into a generic error for the client: only 503 or 504. */
export function toClientAIError(error: unknown): AppError {
  const status = statusOf(error)
  if (status === 504) return new AppError(AI_TIMEOUT_MESSAGE, 504)
  if (status === 429) return new AppError(AI_BUSY_MESSAGE, 503)
  return new AppError(AI_UNAVAILABLE_MESSAGE, 503)
}

/**
 * Whether trying again can help. A rejected key, a forbidden request, a bad request or the
 * provider's own rate limit will fail the same way, and each retry is another paid call.
 */
export function isRetryableAIError(error: unknown): boolean {
  const status = statusOf(error)
  return status === undefined || ![400, 401, 403, 429].includes(status)
}
