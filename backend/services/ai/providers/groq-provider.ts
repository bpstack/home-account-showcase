// services/ai/providers/groq-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'
import { AppError } from '../../../utils/app-error.js'
import { logger } from '../../../utils/logger.js'

interface GroqResponse {
  choices?: Array<{
    message?: { role: string; content: string }
    finish_reason?: string
  }>
  error?: { message: string; type: string }
}

export class GroqProvider implements IAIProvider {
  readonly name = 'Groq'
  private apiKey: string | null = null
  private config: AIProviderConfig
  private baseUrl = 'https://api.groq.com/openai/v1'

  constructor(config: AIProviderConfig) {
    this.config = config
    this.apiKey = config.apiKey || process.env.GROQ_API_KEY || null
    if (config.baseUrl) {
      const base = config.baseUrl.replace(/\/+$/, '')
      this.baseUrl = base.endsWith('/openai/v1') ? base : `${base}/openai/v1`
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError('Groq API key not configured', 503)
    }

    logger.info('AI_GROQ', 'sendPrompt', `Sending prompt (${prompt.length} chars)`)
    const startTime = Date.now()

    const url = `${this.baseUrl}/chat/completions`
    const body = {
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData?.error?.message || response.statusText
        if (response.status === 429) {
          logger.warn('AI_GROQ', 'sendPrompt', 'Rate limit exceeded')
          throw new AppError('Groq: Rate limit exceeded. Please wait a few minutes.', 429)
        }
        if (response.status === 401) {
          logger.error('AI_GROQ', 'sendPrompt', 'Invalid API key', new Error('Unauthorized'))
          throw new AppError('Groq: Invalid API key', 401)
        }
        throw new AppError(`Groq API error: ${response.status} - ${errorMsg}`, response.status)
      }

      const data: GroqResponse = await response.json()
      logger.info('AI_GROQ', 'sendPrompt', `Response received in ${elapsed}ms`)

      if (data.error) {
        throw new AppError(`Groq error: ${data.error.message}`, 500)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new AppError('No content in Groq response', 500)
      }

      return content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('AI_GROQ', 'sendPrompt', 'Request timeout', new Error('AbortError'))
        throw new AppError(`Groq request timeout after ${this.config.timeout}ms`, 504)
      }
      throw error
    }
  }
}
