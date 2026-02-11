// services/ai/providers/claude-provider.ts
import Anthropic from '@anthropic-ai/sdk'
import type { IAIProvider, AIProviderConfig } from '../types.js'
import { AppError } from '../../../utils/app-error.js'
import { logger } from '../../../utils/logger.js'

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
      throw new AppError('Claude client not initialized - missing API key', 503)
    }

    logger.info('AI_CLAUDE', 'sendPrompt', `Sending prompt (${prompt.length} chars)`)
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
    logger.info('AI_CLAUDE', 'sendPrompt', `Response received in ${elapsed}ms`)

    const content = (response as Anthropic.Message).content[0]
    if (content.type !== 'text') {
      throw new AppError('Unexpected response type from Claude', 500)
    }

    return content.text.trim()
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      logger.error('AI_CLAUDE', 'timeout', `Request timeout after ${ms}ms`, new Error('Timeout'))
      reject(new AppError(`Claude request timeout after ${ms}ms`, 504))
    })
  }
}
