// The startup log names only the provider the chat runs on and its model (2026-11-20): it used to
// list all five providers with their default models, so names nobody uses (an old Claude, Gemini
// 2.0) read as if they were the app's.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeAIStatus } from './ai-client.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('AI line in the startup log', () => {
  it('names the active provider and its model, and no other provider', () => {
    vi.stubEnv('AI_ENABLED', 'true')
    vi.stubEnv('AI_PROVIDER', 'groq')
    vi.stubEnv('GROQ_ENABLED', 'true')
    vi.stubEnv('GROQ_API_KEY', 'test-key')
    vi.stubEnv('GROQ_MODEL', '')

    const line = describeAIStatus()

    expect(line).toBe('AI: Groq · openai/gpt-oss-120b')
    expect(line).not.toMatch(/claude|gemini|ollama|hugging/i)
  })

  it('says AI is disabled when it is', () => {
    vi.stubEnv('AI_ENABLED', 'false')
    expect(describeAIStatus()).toBe('AI: disabled')
  })

  it('says there is no provider when the configured one has no key', () => {
    vi.stubEnv('AI_ENABLED', 'true')
    vi.stubEnv('AI_PROVIDER', 'groq')
    vi.stubEnv('GROQ_ENABLED', 'true')
    vi.stubEnv('GROQ_API_KEY', '')
    expect(describeAIStatus()).toBe('AI: no provider available')
  })
})
