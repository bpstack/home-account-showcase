// services/ai/providers/groq-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'

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
      throw new Error('Groq API key not configured')
    }

    console.log(`[AI:Groq] Sending prompt (${prompt.length} chars)...`)
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
          throw new Error('Groq: Rate limit. Espera unos minutos.')
        }
        if (response.status === 401) {
          throw new Error('Groq: API key inválida')
        }
        throw new Error(`Groq API error: ${response.status} - ${errorMsg}`)
      }

      const data: GroqResponse = await response.json()
      console.log(`[AI:Groq] Response received in ${elapsed}ms`)

      if (data.error) {
        throw new Error(`Groq error: ${data.error.message}`)
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in Groq response')
      }

      return content.trim()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Groq request timeout after ${this.config.timeout}ms`)
      }
      throw error
    }
  }
}
