// services/ai/providers/huggingface-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'
import { AppError } from '../../../utils/app-error.js'
import { logger } from '../../../utils/logger.js'

interface HuggingFaceResponse {
  choices?: Array<{
    message?: { role: string; content: string }
    finish_reason?: string
  }>
  error?: { message: string; type: string }
}

export class HuggingFaceProvider implements IAIProvider {
  readonly name = 'HuggingFace'
  private apiKey: string | null = null
  private config: AIProviderConfig
  private baseUrl = 'https://router.huggingface.co/v1'

  constructor(config: AIProviderConfig) {
    this.config = config
    this.apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY || null
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    }
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError('HuggingFace API key not configured', 503)
    }

    logger.info('AI_HUGGINGFACE', 'sendPrompt', `Sending prompt (${prompt.length} chars)`)
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
        const errorMsg = errorData?.error?.message || errorData?.error || response.statusText
        if (response.status === 429) {
          logger.warn('AI_HUGGINGFACE', 'sendPrompt', 'Rate limit exceeded')
          throw new AppError(
            'HuggingFace: Rate limit exceeded. Please wait or upgrade your plan.',
            429
          )
        }
        if (response.status === 401) {
          logger.error('AI_HUGGINGFACE', 'sendPrompt', 'Invalid API key', new Error('Unauthorized'))
          throw new AppError('HuggingFace: Invalid API key', 401)
        }
        if (response.status === 503) {
          const estimatedTime = errorData?.estimated_time || 60
          logger.warn('AI_HUGGINGFACE', 'sendPrompt', `Model loading, ETA: ${estimatedTime}s`)
          throw new AppError(
            `HuggingFace: Model is loading. Please try again in ${Math.ceil(estimatedTime)} seconds.`,
            503
          )
        }
        throw new AppError(
          `HuggingFace API error: ${response.status} - ${errorMsg}`,
          response.status
        )
      }

      const data: HuggingFaceResponse = await response.json()
      logger.info('AI_HUGGINGFACE', 'sendPrompt', `Response received in ${elapsed}ms`)

      if (data.error) {
        throw new AppError(`HuggingFace error: ${data.error.message}`, 500)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new AppError('No content in HuggingFace response', 500)
      }

      return content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('AI_HUGGINGFACE', 'sendPrompt', 'Request timeout', new Error('AbortError'))
        throw new AppError(`HuggingFace request timeout after ${this.config.timeout}ms`, 504)
      }
      throw error
    }
  }
}
