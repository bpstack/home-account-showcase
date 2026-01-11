// services/ai/types.ts
// Types for AI integration

export type AIProviderType = 'none' | 'claude' | 'gemini' | 'groq' | 'ollama'

export interface AIProviderConfig {
  provider: AIProviderType
  apiKey?: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  maxRetries: number
  baseUrl?: string
}

export interface IAIProvider {
  readonly name: string
  isAvailable(): boolean
  sendPrompt(prompt: string): Promise<string>
}

export interface AIStatus {
  enabled: boolean
  activeProvider: string
  providers: Record<string, {
    configured: boolean
    enabled: boolean
    model: string
    baseUrl?: string
  }>
}

export interface ParsedTransactionAI {
  date: string
  description: string
  amount: number
  category?: string
  subcategory?: string
}

export interface AIParseResult {
  success: boolean
  transactions: ParsedTransactionAI[]
  provider: string
  responseTime: number
  error?: string
}

export const PROVIDER_DEFAULTS: Record<AIProviderType, Partial<AIProviderConfig>> = {
  none: {
    provider: 'none',
    model: '',
    temperature: 0,
    maxTokens: 0,
    timeout: 0,
    maxRetries: 0,
  },
  claude: {
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.1,
    maxTokens: 4000,
    timeout: 60000,
    maxRetries: 2,
  },
  gemini: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    temperature: 0.1,
    maxTokens: 4000,
    timeout: 60000,
    maxRetries: 2,
  },
  groq: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    maxTokens: 4000,
    timeout: 60000,
    maxRetries: 2,
    baseUrl: 'https://api.groq.com/openai/v1',
  },
  ollama: {
    provider: 'ollama',
    model: 'llama2:latest',
    temperature: 0.1,
    maxTokens: 4000,
    timeout: 180000,
    maxRetries: 1,
    baseUrl: 'http://localhost:11434',
  },
}
