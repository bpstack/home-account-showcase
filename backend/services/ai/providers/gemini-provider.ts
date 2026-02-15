// services/ai/providers/gemini-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'
import { AppError } from '../../../utils/app-error.js'
import { logger } from '../../../utils/logger.js'

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  error?: { message: string; code: number }
}

export class GeminiProvider implements IAIProvider {
  readonly name = 'Gemini'
  private apiKey: string | null = null
  private config: AIProviderConfig
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(config: AIProviderConfig) {
    this.config = config
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || null
  }

  isAvailable(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new AppError('Gemini API key not configured', 503)
    }

    logger.info('AI_GEMINI', 'sendPrompt', `Sending prompt (${prompt.length} chars)`)
    const startTime = Date.now()

    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.apiKey}`
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
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
        const errorData = await response.json().catch(() => ({}))
        logger.error('AI_GEMINI', 'sendPrompt', `API error: ${response.status}`, errorData)
        throw new AppError(
          `Gemini API error: ${response.status} - ${errorData?.error?.message || response.statusText}`,
          response.status
        )
      }

      const data: GeminiResponse = await response.json()
      logger.info('AI_GEMINI', 'sendPrompt', `Response received in ${elapsed}ms`)

      if (data.error) {
        throw new AppError(`Gemini error: ${data.error.message}`, 500)
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new AppError('No text response from Gemini', 500)
      }

      return text.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('AI_GEMINI', 'sendPrompt', 'Request timeout', new Error('AbortError'))
        throw new AppError(`Gemini request timeout after ${this.config.timeout}ms`, 504)
      }
      throw error
    }
  }
}
