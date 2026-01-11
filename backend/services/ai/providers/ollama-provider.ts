// services/ai/providers/ollama-provider.ts
import type { IAIProvider, AIProviderConfig } from '../types.js'

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
    console.log(`[AI:Ollama] Sending prompt (${prompt.length} chars) to ${this.baseUrl}...`)
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
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }

      const data: OllamaResponse = await response.json()
      console.log(`[AI:Ollama] Response received in ${elapsed}ms`)

      if (data.error) {
        throw new Error(`Ollama error: ${data.error}`)
      }

      if (!data.response) {
        throw new Error('No response from Ollama')
      }

      return data.response.trim()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Ollama request timeout after ${this.config.timeout}ms`)
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new Error(`Ollama no accesible en ${this.baseUrl}. ¿Está Docker/Ollama corriendo?`)
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
        return { ok: false, error: `Ollama returned ${response.status}` }
      }

      const data = await response.json()
      const models = data.models || []
      const modelNames = models.map((m: { name: string }) => m.name)

      if (!modelNames.some((name: string) => name.includes(this.config.model.split(':')[0]))) {
        return {
          ok: false,
          error: `Modelo ${this.config.model} no encontrado. Disponibles: ${modelNames.join(', ')}`,
        }
      }

      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
