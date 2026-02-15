// services/ai/providers/ollama-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'
import { AppError } from '../../../utils/app-error.js'
import { logger } from '../../../utils/logger.js'

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  error?: string
}

export class OllamaProvider implements IAIProvider {
  readonly name = 'Ollama'
  private config: AIProviderConfig
  private baseUrl: string

  constructor(config: AIProviderConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  }

  isAvailable(): boolean {
    return true // Ollama doesn't need API key, just needs to be running
  }

  async sendPrompt(prompt: string): Promise<string> {
    logger.info(
      'AI_OLLAMA',
      'sendPrompt',
      `Sending prompt (${prompt.length} chars) to ${this.baseUrl}`
    )
    const startTime = Date.now()

    const url = `${this.baseUrl}/api/generate`
    const body = {
      model: this.config.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: this.config.temperature,
        num_predict: this.config.maxTokens,
      },
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const elapsed = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        logger.error('AI_OLLAMA', 'sendPrompt', `API error: ${response.status}`, errorText)
        throw new AppError(`Ollama API error: ${response.status} - ${errorText}`, response.status)
      }

      const data: OllamaResponse = await response.json()
      logger.info('AI_OLLAMA', 'sendPrompt', `Response received in ${elapsed}ms`)

      if (data.error) {
        throw new AppError(`Ollama error: ${data.error}`, 500)
      }

      if (!data.response) {
        throw new AppError('No response from Ollama', 500)
      }

      return data.response.trim()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('AI_OLLAMA', 'sendPrompt', 'Request timeout', new Error('AbortError'))
          throw new AppError(`Ollama request timeout after ${this.config.timeout}ms`, 504)
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          logger.error(
            'AI_OLLAMA',
            'sendPrompt',
            `Ollama not accessible at ${this.baseUrl}`,
            new Error('Connection refused')
          )
          throw new AppError(
            `Ollama not accessible at ${this.baseUrl}. Is Docker/Ollama running?`,
            503
          )
        }
      }

      throw error
    }
  }

  async checkHealth(): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        logger.error(
          'AI_OLLAMA',
          'checkHealth',
          `Health check failed: ${response.status}`,
          new Error('Health check failed')
        )
        return { ok: false, error: `Ollama returned ${response.status}` }
      }

      const data = await response.json()
      const models = data.models || []
      const modelNames = models.map((m: { name: string }) => m.name)

      if (!modelNames.some((name: string) => name.includes(this.config.model.split(':')[0]))) {
        logger.error(
          'AI_OLLAMA',
          'checkHealth',
          `Model ${this.config.model} not found`,
          new Error('Model not found')
        )
        return {
          ok: false,
          error: `Model ${this.config.model} not found. Available: ${modelNames.join(', ')}`,
        }
      }

      return { ok: true }
    } catch (error) {
      logger.error('AI_OLLAMA', 'checkHealth', 'Health check failed', error as Error)
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
