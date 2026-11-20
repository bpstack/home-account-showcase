// services/ai/chat-limits.ts
// Size limits of the investment chat (ADR-013), kept free of imports so they can be tested alone.

/** Longest question a user can send. Longer ones are rejected with a message, never cut. */
export const CHAT_MESSAGE_MAX_CHARS = 2000

/** Longest AI reply that is stored and shown. */
export const CHAT_REPLY_MAX_CHARS = 8000

const CUT_MARK = '\n\n…(respuesta recortada)'

/**
 * The reply as it is stored and shown: at most CHAT_REPLY_MAX_CHARS, cut at the last paragraph or
 * sentence break that fits and marked as cut, so a long answer never fills the database.
 */
export function capChatReply(reply: unknown): string {
  const text = typeof reply === 'string' ? reply : String(reply ?? '')
  if (text.length <= CHAT_REPLY_MAX_CHARS) return text

  const room = CHAT_REPLY_MAX_CHARS - CUT_MARK.length
  const head = text.slice(0, room)
  const breakAt = Math.max(head.lastIndexOf('\n'), head.lastIndexOf('. '))
  const cut = breakAt > room / 2 ? head.slice(0, breakAt + 1) : head
  return cut.trimEnd() + CUT_MARK
}
