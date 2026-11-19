import { asyncHandler } from '../../utils/async-handler.js'
import { Request, Response } from 'express'
import { AIClient } from '../../services/ai/ai-client.js'
import { getAIRateLimitStatus } from '../../middlewares/aiRateLimiter.js'

/**
 * Whether any AI is active and, if so, which one. It reports only the active provider: which
 * other providers have keys, or where Ollama runs, is server configuration and stays there.
 */
export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const client = new AIClient()
  const active = client.isAvailable()

  const userId = (req as any).user?.id

  res.status(200).json({
    success: true,
    active,
    provider: active ? client.getProviderName() : null,
    model: active ? client.getConfig().model : null,
    rateLimit: active && userId ? await getAIRateLimitStatus(userId) : null,
  })
})
