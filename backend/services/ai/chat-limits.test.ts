// Limits from ADR-013: questions up to 2,000 characters, rejected beyond that; replies stored up
// to 8,000 characters. The numbers below come from that decision, not from the code.
import { describe, expect, it } from 'vitest'
import { capChatReply } from './chat-limits.js'
import { ChatMessageSchema } from '../../controllers/investment/validation.js'

describe('chat question length', () => {
  it('accepts a question of exactly 2,000 characters', () => {
    expect(ChatMessageSchema.safeParse({ message: 'a'.repeat(2000) }).success).toBe(true)
  })

  it('rejects a question of 2,001 characters with a message that says the limit', () => {
    const result = ChatMessageSchema.safeParse({ message: 'a'.repeat(2001) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toContain('2.000')
  })

  it('counts the length after trimming outer spaces', () => {
    expect(ChatMessageSchema.safeParse({ message: `  ${'a'.repeat(2000)}  ` }).success).toBe(true)
  })
})

describe('chat reply length', () => {
  it('keeps a reply of exactly 8,000 characters untouched', () => {
    const reply = 'b'.repeat(8000)
    expect(capChatReply(reply)).toBe(reply)
  })

  it('cuts a longer reply to at most 8,000 characters and says it was cut', () => {
    const capped = capChatReply('Una frase. '.repeat(2000))
    expect(capped.length).toBeLessThanOrEqual(8000)
    expect(capped).toContain('recortada')
  })

  it('cuts at a sentence break, not mid-word', () => {
    const capped = capChatReply('Una frase. '.repeat(2000))
    expect(capped.split('\n\n…')[0].endsWith('.')).toBe(true)
  })

  it('stores a non-text reply as text', () => {
    expect(capChatReply(undefined)).toBe('')
  })
})
