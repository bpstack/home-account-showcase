// services/ai/investment-ai.ts
// Investment AI Service - Combina prompts con el cliente IA

import { AIClient, createAIClient } from './ai-client.js'
import type { AIProviderType } from './types.js'
import {
  buildProfileAssessmentPrompt,
  parseProfileAssessmentResponse,
  ProfileAnswers,
  ProfileAssessmentResult
} from './prompts/profile-prompt.js'
import {
  buildRecommendationPrompt,
  parseRecommendationResponse,
  RecommendationResult
} from './prompts/recommendation-prompt.js'
import {
  buildChatPrompt,
  parseChatResponse,
  buildSystemMessage,
  ChatMessage,
  ChatResult
} from './prompts/chat-prompt.js'
import {
  buildEducationPrompt,
  parseEducationResponse,
  EducationResult
} from './prompts/education-prompt.js'
import {
  InvestmentContext,
  MarketDataContext,
  ChatContext
} from './prompts/types.js'
import { getMarketData } from '../market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { getActiveProvider } from './ai-client.js'

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
      throw new Error('IA no disponible')
    }

    // Get market data
    const marketData = await getMarketData()

    // Build prompt
    const prompt = buildProfileAssessmentPrompt(answers, context, marketData)

    // Send to AI
    const response = await this.client.sendPromptJSON<ProfileAssessmentResult>(prompt)

    // Log session
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
      throw new Error('IA no disponible')
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
    accountId: string,
    userId: string
  ): Promise<ChatResult> {
    const startTime = Date.now()

    if (!this.isAvailable()) {
      throw new Error('IA no disponible')
    }

    // Add system message at the start if history is empty
    const systemMessage = buildSystemMessage(context)
    const enrichedHistory = chatHistory.length === 0
      ? [{ role: 'system', content: systemMessage } as ChatMessage, ...chatHistory]
      : chatHistory

    const prompt = buildChatPrompt(message, context, enrichedHistory)

    const response = await this.client.sendPromptJSON<ChatResult>(prompt)

    const responseTime = Date.now() - startTime
    console.log(`[InvestmentAI:Chat] Response in ${responseTime}ms`)

    return response
  }

  async chatWithSession(
    message: string,
    accountId: string,
    userId: string,
    financialContext: InvestmentContext
  ): Promise<ChatResult> {
    // Get or create chat session
    let session = (await InvestmentRepository.getChatSessionsByAccount(accountId))[0]

    if (!session || this.isSessionExpired(session.last_message_at)) {
      // Create new session
      session = await InvestmentRepository.createChatSession({
        account_id: accountId,
        user_id: userId,
        provider: getActiveProvider()
      })
    }

    // Get chat history
    const history = await InvestmentRepository.getChatMessagesForContext(session.id, 20)

    // Build chat context
    const marketData = await getMarketData()
    const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

    const chatContext: ChatContext = {
      accountId,
      financialSummary: {
        avgMonthlyIncome: financialContext.avgMonthlyIncome,
        savingsCapacity: financialContext.savingsCapacity,
        savingsRate: financialContext.savingsRate,
        emergencyFundCurrent: financialContext.emergencyFundCurrent,
        emergencyFundGoal: financialContext.emergencyFundGoal,
        historicalMonths: financialContext.historicalMonths,
        trend: financialContext.trend
      },
      investmentProfile: investmentProfile ? {
        risk_profile: investmentProfile.risk_profile
      } : undefined,
      marketPrices: marketData
    }

    const result = await this.chat(message, chatContext, history, accountId, userId)

    // Save messages
    await InvestmentRepository.addChatMessage({
      session_id: session.id,
      role: 'user',
      content: message
    })

    await InvestmentRepository.addChatMessage({
      session_id: session.id,
      role: 'assistant',
      content: result.answer
    })

    // Update session
    const messageCount = history.length + 2
    await InvestmentRepository.updateChatSession(session.id, messageCount)

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
      throw new Error('IA no disponible')
    }

    const marketData = await getMarketData()
    const prompt = buildEducationPrompt(
      concept,
      userLevel,
      {
        sp500: marketData.sp500.value,
        btc: marketData.btc.value,
        eurUsd: marketData.eurUsd
      }
    )

    return this.client.sendPromptJSON(prompt)
  }

  // ========================
  // HELPER METHODS
  // ========================

  private async logInvestmentSession(
    accountId: string,
    userId: string,
    type: 'profile_assessment' | 'recommendation' | 'simulation' | 'education',
    responseTime: number,
    response: any
  ): Promise<void> {
    try {
      await InvestmentRepository.createSession({
        accountId,
        userId,
        type,
        providerUsed: this.getProviderName(),
        responseTimeMs: responseTime
      })
    } catch (error) {
      console.error('[InvestmentAI] Error logging session:', error)
    }
  }
}

// Export helper function
export function createInvestmentAI(provider?: AIProviderType): InvestmentAI {
  return new InvestmentAI(provider)
}
