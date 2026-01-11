// services/ai/providers/index.ts
import type { IAIProvider, AIProviderConfig, AIProviderType } from '../types.js'
import { PROVIDER_DEFAULTS } from '../types.js'
import { ClaudeProvider } from './claude-provider.js'
import { GeminiProvider } from './gemini-provider.js'
import { GroqProvider } from './groq-provider.js'
import { OllamaProvider } from './ollama-provider.js'

export { ClaudeProvider } from './claude-provider.js'
export { GeminiProvider } from './gemini-provider.js'
export { GroqProvider } from './groq-provider.js'
export { OllamaProvider } from './ollama-provider.js'

export function createProvider(config: AIProviderConfig): IAIProvider | null {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config)
    case 'gemini':
      return new GeminiProvider(config)
    case 'groq':
      return new GroqProvider(config)
    case 'ollama':
      return new OllamaProvider(config)
    case 'none':
    default:
      return null
  }
}

export function getProviderConfigFromEnv(provider: AIProviderType): AIProviderConfig {
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.none

  switch (provider) {
    case 'claude':
      return {
        ...defaults,
        provider: 'claude',
        apiKey: process.env.CLAUDE_API_KEY,
        model: process.env.CLAUDE_MODEL || defaults.model,
      } as AIProviderConfig

    case 'gemini':
      return {
        ...defaults,
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || defaults.model,
      } as AIProviderConfig

    case 'groq':
      return {
        ...defaults,
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || defaults.model,
        baseUrl: process.env.GROQ_BASE_URL || defaults.baseUrl,
      } as AIProviderConfig

    case 'ollama':
      return {
        ...defaults,
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || defaults.baseUrl,
        model: process.env.OLLAMA_MODEL || defaults.model,
      } as AIProviderConfig

    default:
      return {
        provider: 'none',
        model: '',
        temperature: 0,
        maxTokens: 0,
        timeout: 0,
        maxRetries: 0,
      }
  }
}
