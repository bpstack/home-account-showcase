// services/ai/ai-client.ts
// Multi-provider AI client for transaction parsing

import type { AIProviderConfig, AIProviderType, IAIProvider, AIStatus } from './types.js'
import { PROVIDER_DEFAULTS } from './types.js'
import { createProvider, getProviderConfigFromEnv } from './providers/index.js'
import { getPersistedProvider, setPersistedProvider, initializeAISettings, hasPersistedSettings } from './ai-settings.js'

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
  if (envProvider && ['claude', 'gemini', 'groq', 'ollama', 'none'].includes(envProvider)) {
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
  console.log(`[AI] Active provider changed to: ${provider}`)
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
      throw new Error('AI provider not available')
    }

    const startTime = Date.now()
    console.log(`[AI:${this.getProviderName()}] Sending prompt (${prompt.length} chars)...`)

    try {
      const response = await this.provider.sendPrompt(prompt)
      const elapsed = Date.now() - startTime
      console.log(`[AI:${this.getProviderName()}] Response received in ${elapsed}ms`)
      return response

    } catch (error) {
      console.error(`[AI:${this.getProviderName()}] Attempt ${retryCount + 1} failed:`, error)

      if (retryCount < this.config.maxRetries) {
        console.log(`[AI:${this.getProviderName()}] Retrying... (${retryCount + 1}/${this.config.maxRetries})`)
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

    try {
      return JSON.parse(trimmed)
    } catch {
      // Try to find JSON in markdown code blocks
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) || trimmed.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        return JSON.parse(jsonStr.trim())
      }
      throw new Error('No valid JSON found in response')
    }
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

  const providerTypes: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama']

  for (const type of providerTypes) {
    const config = getProviderConfigFromEnv(type)
    const enabled = isProviderEnabled(type)
    const hasApiKey = type === 'ollama'
      ? true
      : !!config.apiKey

    providers[type] = {
      configured: hasApiKey,
      enabled: enabled && hasApiKey,
      model: config.model || PROVIDER_DEFAULTS[type]?.model || '',
      ...(type === 'ollama' && { baseUrl: config.baseUrl }),
    }
  }

  const configuredProvider = getConfiguredProvider()
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
        error: 'Ollama solo está disponible en entorno local. En producción, selecciona otro proveedor (Groq, Claude o Gemini).'
      }
    }
    return { success: false, error: `El proveedor ${providerType} no está habilitado en este entorno` }
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

  console.log(`🤖 AI Integration: ${enabled ? '✅ enabled' : '❌ disabled'}`)

  if (enabled) {
    console.log(`   ⚡ Active: ${status.activeProvider}`)

    const providerTypes: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama']
    for (const type of providerTypes) {
      const config = getProviderConfigFromEnv(type)
      const providerEnabled = isProviderEnabled(type)
      const hasApiKey = type === 'ollama' ? true : !!config.apiKey
      const isConfigured = providerEnabled && hasApiKey

      const icon = isConfigured ? '✅' : '❌'
      const model = config.model || PROVIDER_DEFAULTS[type]?.model || 'not set'

      if (type === 'ollama') {
        const baseUrl = config.baseUrl || 'http://localhost:11434'
        console.log(`   📦 ${type.charAt(0).toUpperCase() + type.slice(1)}: ${icon} ${model} @ ${baseUrl}`)
      } else {
        console.log(`   📦 ${type.charAt(0).toUpperCase() + type.slice(1)}: ${icon} ${model}`)
      }
    }
  }
}
