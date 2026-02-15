// services/ai/investment-ai.ts
// Investment AI Service - Combina prompts con el cliente IA

import { AIClient, createAIClient } from './ai-client.js'
import type { AIProviderType } from './types.js'
import { buildProfileAssessmentPrompt, ProfileAnswers } from './prompts/profile-prompt.js'
import { buildRecommendationPrompt } from './prompts/recommendation-prompt.js'
import { buildChatPrompt, buildSystemMessage } from './prompts/chat-prompt.js'
import { buildEducationPrompt } from './prompts/education-prompt.js'
import {
  InvestmentContext,
  ChatContext,
  ProfileAssessmentResult,
  RecommendationResult,
  ChatResult,
  ChatMessage,
  EducationResult,
} from './prompts/types.js'
import { getMarketData } from '../market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { getActiveProvider } from './ai-client.js'
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
  // PROFILE ASSESSMENT
  // ========================

  async assessProfile(
    answers: ProfileAnswers,
    context: InvestmentContext
  ): Promise<ProfileAssessmentResult> {
    const startTime = Date.now()

    if (!this.isAvailable()) {
      throw new AppError('AI not available', 503)
    }

    const marketData = await getMarketData()

    const prompt = buildProfileAssessmentPrompt(answers, context, marketData)

    const response = await this.client.sendPromptJSON<ProfileAssessmentResult>(prompt)

    const responseTime = Date.now() - startTime
    await this.logInvestmentSession(
      context.accountId || '',
      context.userId || '',
      'profile_assessment',
      responseTime,
      response
    )

    return response
  }

  // ========================
  // RECOMMENDATIONS
  // ========================

  async generateRecommendations(
    profile: 'conservative' | 'balanced' | 'dynamic',
    monthlyAmount: number,
    context: InvestmentContext
  ): Promise<RecommendationResult> {
    const startTime = Date.now()

    if (!this.isAvailable()) {
      throw new AppError('AI not available', 503)
    }

    const marketData = await getMarketData()
    const prompt = buildRecommendationPrompt(profile, monthlyAmount, context, marketData)

    const response = await this.client.sendPromptJSON<RecommendationResult>(prompt)

    const responseTime = Date.now() - startTime
    await this.logInvestmentSession(
      context.accountId || '',
      context.userId || '',
      'recommendation',
      responseTime,
      response
    )

    return response
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

  async chatWithSession(
    message: string,
    accountId: string,
    userId: string,
    financialContext: InvestmentContext
  ): Promise<ChatResult> {
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Starting')

    let session = (await InvestmentRepository.getChatSessionsByAccount(accountId))[0]
    logger.info('INVESTMENT_AI', 'chatWithSession', `Existing session: ${session?.id || 'none'}`)

    if (!session || this.isSessionExpired(session.last_message_at)) {
      logger.info('INVESTMENT_AI', 'chatWithSession', 'Creating new session')
      session = await InvestmentRepository.createChatSession({
        account_id: accountId,
        user_id: userId,
        provider: getActiveProvider(),
      })
      logger.info('INVESTMENT_AI', 'chatWithSession', `New session created: ${session.id}`)
    }

    const history = (await InvestmentRepository.getChatMessagesForContext(
      session.id,
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
      investmentProfile: investmentProfile
        ? {
            risk_profile: investmentProfile.risk_profile,
          }
        : undefined,
      marketPrices: marketData,
    }

    logger.info('INVESTMENT_AI', 'chatWithSession', 'Calling chat')
    const result = await this.chat(message, chatContext, history, accountId, userId)
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Chat result received')

    await InvestmentRepository.addChatMessage({
      session_id: session.id,
      role: 'user',
      content: message,
    })

    await InvestmentRepository.addChatMessage({
      session_id: session.id,
      role: 'assistant',
      content: result.answer,
    })

    const messageCount = history.length + 2
    await InvestmentRepository.updateChatSession(session.id, messageCount)
    logger.info('INVESTMENT_AI', 'chatWithSession', 'Messages saved, done')

    return result
  }

  private isSessionExpired(lastMessageAt?: Date): boolean {
    if (!lastMessageAt) return true
    const expiry = 30 * 60 * 1000 // 30 minutes
    return Date.now() - new Date(lastMessageAt).getTime() > expiry
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
      sp500: marketData.sp500.value,
      btc: marketData.btc.value,
      eurUsd: marketData.eurUsd,
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
