// services/ai/chat-reply.ts
// Turns what the model returned into the reply that is stored and shown. Free of DB and network
// imports so it can be tested alone.

import { z } from 'zod'
import { validateAIOutput } from './security/output-validator.js'
import { capChatReply } from './chat-limits.js'
import type { ChatResult } from './prompts/types.js'

/**
 * The shape the chat prompt asks the model for. Only `answer` is required: if any other field is
 * missing or malformed it falls back to a safe value instead of failing the whole reply.
 */
const ModelChatReplySchema = z.object({
  answer: z.string().trim().min(1),
  relatedConcepts: z.array(z.string().trim().min(1).max(80)).max(8).catch([]),
  suggestedFollowUp: z.string().trim().min(1).max(300).optional().catch(undefined),
  usedMarketData: z.boolean().catch(false),
  usedFinancialData: z.boolean().catch(false),
  needsDisclaimer: z.boolean().catch(true),
})

export interface SafeChatReply {
  result: ChatResult
  /** What the output filter found, for the security log. Empty when the reply was clean. */
  issues: string[]
}

/**
 * The reply after the output filter and the size limit, or null when the model did not return a
 * usable answer. What this returns is what gets stored, so the history never holds text the
 * filter blocked or redacted.
 */
export function toSafeChatReply(raw: unknown): SafeChatReply | null {
  const parsed = ModelChatReplySchema.safeParse(raw)
  if (!parsed.success) return null
  const reply = parsed.data

  const answerCheck = validateAIOutput(reply.answer)
  const extras = [...reply.relatedConcepts, reply.suggestedFollowUp ?? ''].join('\n')
  const extrasCheck = validateAIOutput(extras)
  const extrasSafe = extrasCheck.safe && !answerCheck.blocked

  return {
    result: {
      ...reply,
      answer: capChatReply(answerCheck.sanitizedOutput),
      relatedConcepts: extrasSafe ? reply.relatedConcepts : [],
      suggestedFollowUp: extrasSafe ? reply.suggestedFollowUp : undefined,
    },
    issues: [...answerCheck.issues, ...extrasCheck.issues],
  }
}
