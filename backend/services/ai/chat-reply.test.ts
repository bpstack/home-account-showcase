// What the user sees and what is stored must be the filtered reply (security review of
// 2026-11-19, finding 4). Expected values come from that requirement and from the output
// filter's own contract (blocked replies become its fixed refusal; secrets are redacted).
import { describe, expect, it } from 'vitest'
import { toSafeChatReply } from './chat-reply.js'

const reply = (overrides: Record<string, unknown> = {}) => ({
  answer: 'Un ETF es un fondo que cotiza en bolsa.',
  relatedConcepts: ['ETF', 'Diversificación'],
  usedMarketData: false,
  usedFinancialData: false,
  needsDisclaimer: true,
  ...overrides,
})

describe('model reply shape', () => {
  it('keeps a clean reply as it came', () => {
    const safe = toSafeChatReply(reply())
    expect(safe?.result.answer).toBe('Un ETF es un fondo que cotiza en bolsa.')
    expect(safe?.result.relatedConcepts).toEqual(['ETF', 'Diversificación'])
    expect(safe?.issues).toEqual([])
  })

  it('rejects a reply without a text answer', () => {
    expect(toSafeChatReply(reply({ answer: 42 }))).toBeNull()
    expect(toSafeChatReply(reply({ answer: '   ' }))).toBeNull()
    expect(toSafeChatReply({ relatedConcepts: [] })).toBeNull()
    expect(toSafeChatReply('texto suelto')).toBeNull()
  })

  it('falls back to safe values when the other fields are malformed', () => {
    const safe = toSafeChatReply(reply({ relatedConcepts: 'ETF', needsDisclaimer: 'sí' }))
    expect(safe?.result.relatedConcepts).toEqual([])
    expect(safe?.result.needsDisclaimer).toBe(true)
  })
})

describe('output filter before storing', () => {
  it('replaces a reply that leaks the system prompt with the fixed refusal', () => {
    const safe = toSafeChatReply(reply({ answer: 'Claro. System prompt: eres un asesor…' }))
    expect(safe?.result.answer).not.toContain('eres un asesor')
    expect(safe?.result.answer).toMatch(/no puedo procesar/i)
    expect(safe?.issues.length).toBeGreaterThan(0)
  })

  it('drops the related concepts when the answer was blocked', () => {
    const safe = toSafeChatReply(reply({ answer: 'SELECT email FROM users' }))
    expect(safe?.result.relatedConcepts).toEqual([])
  })

  it('drops related concepts and follow-up that carry a leak, keeping a clean answer', () => {
    const safe = toSafeChatReply(
      reply({ relatedConcepts: ['ETF'], suggestedFollowUp: 'Mira process.env.GROQ_API_KEY' })
    )
    expect(safe?.result.answer).toBe('Un ETF es un fondo que cotiza en bolsa.')
    expect(safe?.result.relatedConcepts).toEqual([])
    expect(safe?.result.suggestedFollowUp).toBeUndefined()
  })

  it('applies the 8,000-character limit to the filtered answer', () => {
    const safe = toSafeChatReply(reply({ answer: 'Una frase. '.repeat(2000) }))
    expect(safe?.result.answer.length).toBeLessThanOrEqual(8000)
  })
})
