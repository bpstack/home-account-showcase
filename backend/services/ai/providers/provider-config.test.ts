// Groq model (ADR-010, 2026-11-19): the server works with openai/gpt-oss-120b whether or not the
// environment names a model; llama-3.3-70b-versatile was retired by Groq (ADR-010), and with
// it as the default the chat failed wherever the variable was missing.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProviderConfigFromEnv } from './index.js'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Groq model', () => {
  it('is openai/gpt-oss-120b when the environment does not name one', () => {
    vi.stubEnv('GROQ_MODEL', '')
    expect(getProviderConfigFromEnv('groq').model).toBe('openai/gpt-oss-120b')
  })

  it('is the one the environment names, when it names one', () => {
    vi.stubEnv('GROQ_MODEL', 'some/other-model')
    expect(getProviderConfigFromEnv('groq').model).toBe('some/other-model')
  })
})
