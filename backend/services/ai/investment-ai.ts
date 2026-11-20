// services/ai/investment-ai.ts
// Investment AI Service - Combina prompts con el cliente IA

import { AIClient, createAIClient } from './ai-client.js'
import type { AIProviderType } from './types.js'
import { buildChatPrompt, buildSystemMessage } from './prompts/chat-prompt.js'
import { toSafeChatReply } from './chat-reply.js'
import { logSecurityEvent } from './security/audit-logger.js'
import { buildEducationPrompt } from './prompts/education-prompt.js'
import {
  InvestmentContext,
  ChatContext,
  ChatResult,
  ChatMessage,
  EducationResult,
} from './prompts/types.js'
import { getMarketData } from '../market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

export class InvestmentAI {
  private client: AIClient

  constructor(provider?: AIProviderType) {
    this.client = createAIClient(provider)
  }

  isAvailable(): boolean {
    return this.client.isAvailable()
  }

  getProviderName(): string {
    return this.client.getProviderName()
  }

  // ========================
  // CHAT CONVERSATIONAL
  // ========================

  async chat(
    message: string,
    context: ChatContext,
    chatHistory: ChatMessage[],
    _accountId: string,
    _userId: string
  ): Promise<ChatResult> {
    const startTime = Date.now()

    if (!this.isAvailable()) {
      throw new AppError('AI not available', 503)
    }

    const systemMessage = buildSystemMessage(context)
    const enrichedHistory =
      chatHistory.length === 0
        ? [{ role: 'system', content: systemMessage } as ChatMessage, ...chatHistory]
        : chatHistory

    const prompt = buildChatPrompt(message, context, enrichedHistory)

    const response = await this.client.sendPromptJSON<ChatResult>(prompt)

    const responseTime = Date.now() - startTime
    logger.info('INVESTMENT_AI', 'chat', `Response in ${responseTime}ms`)

    return response
  }

  /** One message in an existing conversation; the caller has checked it belongs to the account. */
  async chatWithSession(
    message: string,
    sessionId: string,
    accountId: string,
    userId: string,
    financialContext: InvestmentContext
  ): Promise<ChatResult> {
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Starting')

    const history = (await InvestmentRepository.getChatMessagesForContext(
      sessionId,
      20
    )) as ChatMessage[]
    logger.info('INVESTMENT_AI', 'chatWithSession', `History messages: ${history.length}`)

    logger.info('INVESTMENT_AI', 'chatWithSession', 'Getting market data')
    const marketData = await getMarketData()
    const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)
    logger.info(
      'INVESTMENT_AI',
      'chatWithSession',
      `Market data ready, profile: ${investmentProfile?.risk_profile || 'none'}`
    )

    const chatContext: ChatContext = {
      accountId,
      financialSummary: {
        avgMonthlyIncome: financialContext.avgMonthlyIncome,
        savingsCapacity: financialContext.savingsCapacity,
        savingsRate: financialContext.savingsRate,
        emergencyFundCurrent: financialContext.emergencyFundCurrent,
        emergencyFundGoal: financialContext.emergencyFundGoal,
        historicalMonths: financialContext.historicalMonths,
        trend: financialContext.trend,
      },
      investmentProfile: investmentProfile?.risk_profile
        ? {
            risk_profile: investmentProfile.risk_profile,
          }
        : undefined,
      marketPrices: marketData,
    }

    logger.info('INVESTMENT_AI', 'chatWithSession', 'Calling chat')
    const raw = await this.chat(message, chatContext, history, accountId, userId)
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Chat result received')

    // Filter before storing: the history and the next prompts only ever see the filtered reply
    const safe = toSafeChatReply(raw)
    if (!safe) {
      throw new AppError('La IA ha devuelto una respuesta no válida. Inténtalo de nuevo.', 502)
    }
    if (safe.issues.length > 0) {
      await logSecurityEvent({
        type: 'unsafe_output_detected',
        userId,
        details: `Output issues: ${safe.issues.join(', ')}`,
      })
    }
    const result = safe.result

    await InvestmentRepository.addChatMessage({
      session_id: sessionId,
      role: 'user',
      content: message,
    })

    await InvestmentRepository.addChatMessage({
      session_id: sessionId,
      role: 'assistant',
      content: result.answer,
    })

    await InvestmentRepository.updateChatSession(sessionId, 2)
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Messages saved, done')

    return result
  }

  // ========================
  // EDUCATION
  // ========================

  async explainConcept(
    concept: string,
    userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
  ): Promise<EducationResult> {
    if (!this.isAvailable()) {
      throw new AppError('AI not available', 503)
    }

    const marketData = await getMarketData()
    const prompt = buildEducationPrompt(concept, userLevel, {
      btc: marketData.btc?.value,
      eurUsd: marketData.eurUsd?.value,
    })

    return this.client.sendPromptJSON(prompt)
  }

  private async logInvestmentSession(
    accountId: string,
    userId: string,
    type: 'profile_assessment' | 'recommendation' | 'simulation' | 'education',
    responseTime: number,
    _response: any
  ): Promise<void> {
    try {
      await InvestmentRepository.createSession({
        accountId,
        userId,
        type,
        providerUsed: this.getProviderName(),
        responseTimeMs: responseTime,
      })
    } catch (error) {
      logger.error('INVESTMENT_AI', 'logInvestmentSession', 'Error logging session', error as Error)
    }
  }
}

// Export helper function
export function createInvestmentAI(provider?: AIProviderType): InvestmentAI {
  return new InvestmentAI(provider)
}
