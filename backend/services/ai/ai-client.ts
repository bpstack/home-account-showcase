// services/ai/ai-client.ts
// Multi-provider AI client for transaction parsing

import type { AIProviderConfig, AIProviderType, IAIProvider, AIStatus } from './types.js'
import { PROVIDER_DEFAULTS } from './types.js'
import { createProvider, getProviderConfigFromEnv } from './providers/index.js'
import {
  getPersistedProvider,
  setPersistedProvider,
  initializeAISettings,
  hasPersistedSettings,
} from './ai-settings.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

/**
 * Clean up common AI JSON issues before parsing
 */
function cleanJSON(jsonStr: string): string {
  return (
    jsonStr
      // Replace N/A with 0 (unquoted values)
      .replace(/"([^"]+)":\s*N\/A\b/gi, '"$1": 0')
      // Remove trailing commas before } or ]
      .replace(/,\s*([}\]])/g, '$1')
      // Remove single-line comments
      .replace(/\/\/.*$/gm, '')
      // Remove multi-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Fix unquoted boolean-like values
      .replace(/:\s*True\b/gi, ': true')
      .replace(/:\s*False\b/gi, ': false')
      .replace(/:\s*None\b/gi, ': null')
  )
}

// Initialize settings on module load
initializeAISettings()

/**
 * Check if AI is enabled via environment variable
 */
export function isAIEnabled(): boolean {
  const enabled = process.env.AI_ENABLED
  return enabled?.toLowerCase() === 'true' || enabled === '1'
}

/**
 * Check if a specific provider is enabled via environment variable
 */
export function isProviderEnabled(provider: AIProviderType): boolean {
  const envVarMap: Record<AIProviderType, string> = {
    claude: 'CLAUDE_ENABLED',
    gemini: 'GEMINI_ENABLED',
    groq: 'GROQ_ENABLED',
    ollama: 'OLLAMA_ENABLED',
    huggingface: 'HUGGINGFACE_ENABLED',
    none: '',
  }

  const envVar = envVarMap[provider]
  if (!envVar) return false

  const value = process.env[envVar]
  if (value === undefined) return true
  return value.toLowerCase() === 'true' || value === '1'
}

/**
 * Get the configured provider (from persisted settings or env)
 * Persisted settings have absolute priority (including 'none')
 */
export function getConfiguredProvider(): AIProviderType {
  // If user has made a selection (file exists), use it - even if 'none'
  if (hasPersistedSettings()) {
    return getPersistedProvider()
  }

  // Otherwise use environment variable as default
  const envProvider = process.env.AI_PROVIDER as AIProviderType
  if (
    envProvider &&
    ['claude', 'gemini', 'groq', 'ollama', 'huggingface', 'none'].includes(envProvider)
  ) {
    return envProvider
  }

  // Default to none
  return 'none'
}

/**
 * Set the active provider (persists to file)
 */
export function setActiveProvider(provider: AIProviderType): void {
  setPersistedProvider(provider)
  logger.info('AI_CLIENT', 'setActiveProvider', `Active provider changed to: ${provider}`)
}

/**
 * Get the current active provider
 */
export function getActiveProvider(): AIProviderType {
  return getConfiguredProvider()
}

/**
 * Multi-provider AI Client
 */
export class AIClient {
  private provider: IAIProvider | null = null
  private config: AIProviderConfig
  private enabled: boolean = false

  constructor(providerType?: AIProviderType, customConfig?: Partial<AIProviderConfig>) {
    if (!isAIEnabled()) {
      this.config = { ...PROVIDER_DEFAULTS.none } as AIProviderConfig
      return
    }

    const type = providerType || this.getDefaultProviderType()

    const envConfig = getProviderConfigFromEnv(type)
    this.config = {
      ...envConfig,
      ...customConfig,
    }

    this.provider = createProvider(this.config)
    this.enabled = this.provider?.isAvailable() ?? false
  }

  /**
   * Get default provider type
   * Respects user selection - NO automatic fallback
   */
  private getDefaultProviderType(): AIProviderType {
    const configured = getConfiguredProvider()

    // Only use if configured AND enabled
    if (configured !== 'none' && isProviderEnabled(configured)) {
      return configured
    }

    // No fallback - return none if nothing explicitly configured
    return 'none'
  }

  isAvailable(): boolean {
    return this.enabled && this.provider !== null
  }

  getProviderName(): string {
    return this.provider?.name || 'None'
  }

  getConfig(): AIProviderConfig {
    return { ...this.config }
  }

  /**
   * Send a prompt and get raw response
   */
  async sendPrompt(prompt: string, retryCount = 0): Promise<string> {
    if (!this.provider || !this.enabled) {
      throw new AppError('AI provider not available', 503)
    }

    const startTime = Date.now()
    logger.info(
      'AI_CLIENT',
      'sendPrompt',
      `Sending prompt (${prompt.length} chars) to ${this.getProviderName()}`
    )

    try {
      const response = await this.provider.sendPrompt(prompt)
      const elapsed = Date.now() - startTime
      logger.info(
        'AI_CLIENT',
        'sendPrompt',
        `Response received in ${elapsed}ms from ${this.getProviderName()}`
      )
      return response
    } catch (error) {
      logger.error('AI_CLIENT', 'sendPrompt', `Attempt ${retryCount + 1} failed`, error as Error)

      if (retryCount < this.config.maxRetries) {
        logger.info(
          'AI_CLIENT',
          'sendPrompt',
          `Retrying... (${retryCount + 1}/${this.config.maxRetries})`
        )
        await this.delay(2000 * (retryCount + 1))
        return this.sendPrompt(prompt, retryCount + 1)
      }

      throw error
    }
  }

  /**
   * Send prompt and parse JSON response
   */
  async sendPromptJSON<T>(prompt: string): Promise<T> {
    const response = await this.sendPrompt(prompt)
    return this.parseJSON<T>(response)
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  private parseJSON<T>(text: string): T {
    const trimmed = text.trim()

    // Strategy 1: Direct parse
    try {
      return JSON.parse(trimmed)
    } catch {
      // Continue to other strategies
    }

    // Strategy 2: Extract from markdown code blocks
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      try {
        const cleaned = cleanJSON(codeBlockMatch[1].trim())
        return JSON.parse(cleaned)
      } catch {
        // Continue to other strategies
      }
    }

    // Strategy 3: Find JSON object pattern (greedy, finds largest match)
    const jsonObjectMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      try {
        const cleaned = cleanJSON(jsonObjectMatch[0].trim())
        return JSON.parse(cleaned)
      } catch {
        // Continue to other strategies
      }
    }

    // Strategy 4: Find JSON array pattern
    const jsonArrayMatch = trimmed.match(/\[[\s\S]*\]/)
    if (jsonArrayMatch) {
      try {
        const cleaned = cleanJSON(jsonArrayMatch[0].trim())
        return JSON.parse(cleaned)
      } catch {
        // Continue
      }
    }

    logger.error(
      'AI_CLIENT',
      'parseJSON',
      'Failed to parse response',
      new Error('No valid JSON found')
    )
    throw new AppError('No valid JSON found in response', 500)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Get AI status for all providers
 */
export function getAIStatus(): AIStatus {
  const providers: AIStatus['providers'] = {}

  const providerTypes: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama', 'huggingface']

  for (const type of providerTypes) {
    const config = getProviderConfigFromEnv(type)
    const enabled = isProviderEnabled(type)
    const hasApiKey = type === 'ollama' ? true : !!config.apiKey

    providers[type] = {
      configured: hasApiKey,
      enabled: enabled && hasApiKey,
      model: config.model || PROVIDER_DEFAULTS[type]?.model || '',
      ...(type === 'ollama' && { baseUrl: config.baseUrl }),
    }
  }

  const _configuredProvider = getConfiguredProvider()
  const client = new AIClient()

  return {
    enabled: isAIEnabled(),
    activeProvider: client.getProviderName(),
    providers,
  }
}

/**
 * Test connection to a specific provider
 */
export async function testProviderConnection(providerType: AIProviderType): Promise<{
  success: boolean
  provider?: string
  model?: string
  responseTime?: number
  error?: string
}> {
  if (!isAIEnabled()) {
    return { success: false, error: 'AI is disabled (AI_ENABLED=false)' }
  }

  if (!isProviderEnabled(providerType)) {
    if (providerType === 'ollama') {
      return {
        success: false,
        error:
          'Ollama is only available in local environment. In production, select another provider (Groq, Claude, or Gemini).',
      }
    }
    return { success: false, error: `Provider ${providerType} is not enabled in this environment` }
  }

  const config = getProviderConfigFromEnv(providerType)
  if (providerType !== 'ollama' && !config.apiKey) {
    return { success: false, error: `No API key configured for ${providerType}` }
  }

  try {
    const client = new AIClient(providerType)
    if (!client.isAvailable()) {
      return { success: false, error: `Provider ${providerType} not available` }
    }

    const startTime = Date.now()
    await client.sendPrompt('Respond with exactly: OK')
    const responseTime = Date.now() - startTime

    return {
      success: true,
      provider: client.getProviderName(),
      model: client.getConfig().model,
      responseTime,
    }
  } catch (error) {
    logger.error(
      'AI_CLIENT',
      'testProviderConnection',
      `Error testing ${providerType}`,
      error as Error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create AI client helper
 */
export function createAIClient(
  providerType?: AIProviderType,
  customConfig?: Partial<AIProviderConfig>
): AIClient {
  return new AIClient(providerType, customConfig)
}

/**
 * Print AI status to console on startup
 */
export function logAIStatus(): void {
  const enabled = isAIEnabled()
  const status = getAIStatus()

  logger.info('AI_CLIENT', 'logAIStatus', `AI Integration: ${enabled ? 'enabled' : 'disabled'}`)

  if (enabled) {
    logger.info('AI_CLIENT', 'logAIStatus', `Active: ${status.activeProvider}`)

    const providerTypes: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama', 'huggingface']
    for (const type of providerTypes) {
      const config = getProviderConfigFromEnv(type)
      const providerEnabled = isProviderEnabled(type)
      const hasApiKey = type === 'ollama' ? true : !!config.apiKey
      const isConfigured = providerEnabled && hasApiKey

      const model = config.model || PROVIDER_DEFAULTS[type]?.model || 'not set'

      if (type === 'ollama') {
        const baseUrl = config.baseUrl || 'http://localhost:11434'
        logger.info(
          'AI_CLIENT',
          'logAIStatus',
          `${type.charAt(0).toUpperCase() + type.slice(1)}: ${model} @ ${baseUrl} (${isConfigured ? 'configured' : 'not configured'})`
        )
      } else {
        logger.info(
          'AI_CLIENT',
          'logAIStatus',
          `${type.charAt(0).toUpperCase() + type.slice(1)}: ${model} (${isConfigured ? 'configured' : 'not configured'})`
        )
      }
    }
  }
}
