import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import {
  getAIStatus,
  testProviderConnection,
  setActiveProvider,
  getActiveProvider,
} from '../../services/ai/ai-client.js'
import type { AIProviderType } from '../../services/ai/types.js'
import { getAIRateLimitStatus, getProviderLimits } from '../../middlewares/aiRateLimiter.js'

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = getAIStatus()

  const userId = (req as any).user?.id || 'anonymous'
  const rateLimit = getAIRateLimitStatus(userId)
  const providerLimits = getProviderLimits()

  res.status(200).json({
    success: true,
    ...status,
    rateLimit,
    providerLimits,
  })
})

export const setProvider = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.body as { provider: AIProviderType }

  if (!provider) {
    throw new AppError('provider es requerido', 400)
  }

  const validProviders: AIProviderType[] = [
    'claude',
    'gemini',
    'groq',
    'ollama',
    'huggingface',
    'none',
  ]
  if (!validProviders.includes(provider)) {
    throw new AppError(`Provider inválido. Válidos: ${validProviders.join(', ')}`, 400)
  }

  setActiveProvider(provider)

  res.status(200).json({
    success: true,
    activeProvider: getActiveProvider(),
  })
})

export const testConnection = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.body as { provider: AIProviderType }

  if (!provider) {
    throw new AppError('provider es requerido', 400)
  }

  const validProviders: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama', 'huggingface']
  if (!validProviders.includes(provider)) {
    throw new AppError(`Provider inválido. Válidos: ${validProviders.join(', ')}`, 400)
  }

  const result = await testProviderConnection(provider)

  res.status(result.success ? 200 : 400).json(result)
})
