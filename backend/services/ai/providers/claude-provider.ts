// services/ai/providers/claude-provider.ts
import Anthropic from '@anthropic-ai/sdk'
import type { IAIProvider, AIProviderConfig } from '../types.js'

export class ClaudeProvider implements IAIProvider {
  readonly name = 'Claude'
  private client: Anthropic | null = null
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    const apiKey = config.apiKey || process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
    }
  }

  isAvailable(): boolean {
    return this.client !== null
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Claude client not initialized - missing API key')
    }

    console.log(`[AI:Claude] Sending prompt (${prompt.length} chars)...`)
    const startTime = Date.now()

    const response = await Promise.race([
      this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      this.timeout(this.config.timeout),
    ])

    const elapsed = Date.now() - startTime
    console.log(`[AI:Claude] Response received in ${elapsed}ms`)

    const content = (response as Anthropic.Message).content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    return content.text.trim()
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Claude request timeout after ${ms}ms`)), ms)
    })
  }
}
