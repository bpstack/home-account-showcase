// Security review of 2026-11-19, finding 5 (ASVS v5.0.0-16.5.1): a provider failure reaches the
// client as a generic message, never with the provider's text or status. Expected values come
// from that requirement: only 503 or 504, and no provider name, key or quota detail.
import { describe, expect, it } from 'vitest'
import { AppError } from '../../utils/app-error.js'
import { isRetryableAIError, toClientAIError } from './ai-errors.js'

const leaks = /groq|gemini|claude|ollama|hugging|api key|quota|rate limit|\d{3}\s*-/i

describe('provider errors seen by the client', () => {
  it('turns a provider 401 (invalid key) into a 503 that says nothing about the key', () => {
    const err = toClientAIError(new AppError('Groq: Invalid API key', 401))
    expect(err.statusCode).toBe(503)
    expect(err.message).not.toMatch(leaks)
  })

  it('turns the provider rate limit into a 503 that says it is busy', () => {
    const err = toClientAIError(new AppError('Groq: Rate limit exceeded. Please wait.', 429))
    expect(err.statusCode).toBe(503)
    expect(err.message).toMatch(/saturada/)
    expect(err.message).not.toMatch(leaks)
  })

  it('keeps a timeout as 504 with a generic message', () => {
    const err = toClientAIError(new AppError('Groq request timeout after 30000ms', 504))
    expect(err.statusCode).toBe(504)
    expect(err.message).not.toMatch(leaks)
  })

  it('hides any other provider message behind a 503', () => {
    const err = toClientAIError(
      new AppError('Gemini API error: 400 - API key not valid. Please pass a valid key.', 400)
    )
    expect(err.statusCode).toBe(503)
    expect(err.message).not.toMatch(leaks)
    expect(toClientAIError(new Error('fetch failed ECONNREFUSED')).statusCode).toBe(503)
  })
})

describe('retries', () => {
  it('does not retry what will fail the same way', () => {
    for (const status of [400, 401, 403, 429]) {
      expect(isRetryableAIError(new AppError('x', status))).toBe(false)
    }
  })

  it('retries server errors, timeouts and network failures', () => {
    expect(isRetryableAIError(new AppError('x', 500))).toBe(true)
    expect(isRetryableAIError(new AppError('x', 504))).toBe(true)
    expect(isRetryableAIError(new Error('fetch failed'))).toBe(true)
  })
})
