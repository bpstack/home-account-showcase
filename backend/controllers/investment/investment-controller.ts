// controllers/investment/investment-controller.ts
// Controlador del módulo de inversión

import { Request, Response } from 'express'
import { createInvestmentAI } from '../../services/ai/investment-ai.js'
import { getActiveProvider } from '../../services/ai/ai-client.js'
import { getMarketData, getMarketDataFull, getQuickSummary } from '../../services/market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import type { ProfileAnswers, InvestmentContext, ChatMessage } from '../../services/ai/prompts/types.js'
import {
  ProfileAnswersSchema,
  UpdateEmergencyFundMonthsSchema,
  UpdateLiquidityReserveSchema,
  ChatMessageSchema
} from './validation.js'
import { checkInputSecurity, checkOutputSecurity } from '../../services/ai/security/index.js'

// ========================
// HELPER: Get account context
// @deprecated This method no longer calculates financial metrics server-side due to E2E encryption.
// It returns safe default values. Financial calculations must be performed on the client side
// using the 'useFinancialMetrics' hook after decrypting transaction data.
// ========================

async function getAccountFinancialContext(accountId: string, userId: string): Promise<InvestmentContext> {
  // E2E ENCRYPTION NOTICE:
  // We cannot calculate financial metrics (savings, income, expenses) server-side because
  // transaction amounts are encrypted in the database.
  // 
  // The client (Frontend) is responsible for:
  // 1. Fetching encrypted transactions
  // 2. Decrypting them using the user's private key
  // 3. Calculating metrics using useFinancialMetrics hook
  //
  // This function now returns default/safe values to maintain API contract without exposing encrypted garbage.
  
  // Get investment profile if exists
  const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

  return {
    accountId,
    userId,
    // Return zeroes/defaults as we can't see the encrypted values
    avgMonthlyIncome: 0,
    avgMonthlyExpenses: 0,
    savingsCapacity: 0,
    savingsRate: 0,
    emergencyFundCurrent: investmentProfile?.liquidity_reserve || 0,
    emergencyFundGoal: 0, // Cannot calculate without expenses
    historicalMonths: 0,
    trend: 'stable',
    deficitMonths: 0,
    investmentPercentage: investmentProfile?.investment_percentage || 20,
    horizonYears: investmentProfile?.horizon_years || 5,
    experienceLevel: investmentProfile?.experience_level as 'none' | 'basic' | 'intermediate' | 'advanced' || 'none',
    transactionCategories: {},
    recentTransactions: []
  }
}

// ========================
// GET /api/investment/:accountId/overview
// ========================

export const getOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    // Verify account access
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    // Get financial context
    const financialContext = await getAccountFinancialContext(accountId, userId)

    // Get investment profile
    const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

    // Get market data
    const marketData = await getMarketData()

    res.status(200).json({
      success: true,
      data: {
        accountId,
        profile: investmentProfile ? {
          riskProfile: investmentProfile.risk_profile,
          horizonYears: investmentProfile.horizon_years,
          hasEmergencyFund: investmentProfile.has_emergency_fund,
          investmentPercentage: investmentProfile.investment_percentage,
          monthlyInvestable: investmentProfile.monthly_investable,
          liquidityReserve: investmentProfile.liquidity_reserve,
          emergencyFundMonths: investmentProfile.emergency_fund_months
        } : null,
        marketPrices: marketData,
        aiEnabled: true,
        activeProvider: getActiveProvider()
      }
    })
  } catch (error) {
    console.error('[Investment:Overview] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// PATCH /api/investment/:accountId/emergency-fund-months
// ========================

export const updateEmergencyFundMonths = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const validation = UpdateEmergencyFundMonthsSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Meses debe ser un número entre 1 y 60' })
      return
    }

    const { months } = validation.data

    await InvestmentRepository.upsertProfile({
      account_id: accountId,
      emergency_fund_months: months,
      risk_profile: 'balanced',
      investment_percentage: 20,
      has_emergency_fund: true,
      experience_level: 'none',
      horizon_years: 5
    })

    res.status(200).json({
      success: true,
      message: 'Meses del fondo de emergencia actualizados'
    })
  } catch (error) {
    console.error('[Investment:UpdateEmergencyFundMonths] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// PATCH /api/investment/:accountId/liquidity-reserve
// ========================

export const updateLiquidityReserve = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const validation = UpdateLiquidityReserveSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Monto debe ser un número positivo' })
      return
    }

    const { amount } = validation.data

    await InvestmentRepository.upsertProfile({
      account_id: accountId,
      liquidity_reserve: amount,
      risk_profile: 'balanced',
      investment_percentage: 20,
      has_emergency_fund: true,
      experience_level: 'none',
      horizon_years: 5
    })

    res.status(200).json({
      success: true,
      message: 'Fondo de emergencia actualizado'
    })
  } catch (error) {
    console.error('[Investment:UpdateLiquidityReserve] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// POST /api/investment/:accountId/analyze-profile
// ========================

export const analyzeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id
    const answers = req.body as ProfileAnswers

    // Decode HTML entities that might come from frontend (e.g., &gt; -> >)
    const decodeHtmlEntities = (str: string) =>
      str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

    // Fix horizonYears if HTML encoded
    if (answers.horizonYears && typeof answers.horizonYears === 'string') {
      answers.horizonYears = decodeHtmlEntities(answers.horizonYears) as any
    }

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    // Validate answers with Zod

    const validation = ProfileAnswersSchema.safeParse(answers)

    if (!validation.success) {
      const errors = validation.error.format()

      // Extract specific field errors for better UX
      const fieldErrors: string[] = []
      for (const [field, err] of Object.entries(errors)) {
        if (field !== '_errors' && err && typeof err === 'object' && '_errors' in err) {
          const messages = (err as any)._errors
          if (messages?.length) {
            fieldErrors.push(`${field}: ${messages.join(', ')}`)
          }
        }
      }

      res.status(400).json({
        success: false,
        error: fieldErrors.length > 0
          ? `Campos inválidos: ${fieldErrors.join('; ')}`
          : 'Datos de perfil inválidos',
        details: errors
      })
      return
    }

    const validAnswers = validation.data

    // Get financial context — prefer client-side metrics (decrypted) over server defaults (all zeros due to E2E)
    const financialContext = await getAccountFinancialContext(accountId, userId)

    if (validAnswers.financialMetrics) {
      const fm = validAnswers.financialMetrics
      financialContext.avgMonthlyIncome = fm.avgMonthlyIncome
      financialContext.avgMonthlyExpenses = fm.avgMonthlyExpenses
      financialContext.savingsCapacity = fm.savingsCapacity
      financialContext.savingsRate = fm.savingsRate
      financialContext.historicalMonths = fm.historicalMonths
      financialContext.trend = fm.trend
      financialContext.deficitMonths = fm.deficitMonths
    }

    // Analyze with AI
    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible' })
      return
    }

    const result = await ai.assessProfile(answers, financialContext)

    // Map Spanish profile names to English for database
    const profileMap: Record<string, 'conservative' | 'balanced' | 'dynamic'> = {
      'conservador': 'conservative',
      'conservative': 'conservative',
      'equilibrado': 'balanced',
      'balanced': 'balanced',
      'dinámico': 'dynamic',
      'dinamico': 'dynamic',
      'dynamic': 'dynamic',
      'agresivo': 'dynamic',
      'aggressive': 'dynamic'
    }

    const dbProfile = profileMap[result.recommendedProfile?.toLowerCase()] || 'balanced'

    // Map horizon years string to number
    const horizonYearsMap: Record<string, number> = {
      '<3': 2,
      '3-10': 5,
      '>10': 15
    }
    const horizonYearsNum = horizonYearsMap[answers.horizonYears] || 5

    // Save/update profile
    await InvestmentRepository.upsertProfile({
      account_id: accountId,
      risk_profile: dbProfile,
      investment_percentage: result.investmentPercentage,
      has_emergency_fund: answers.hasEmergencyFund !== 'no',
      experience_level: answers.experienceLevel,
      horizon_years: horizonYearsNum
    })

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[Investment:AnalyzeProfile] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// POST /api/investment/:accountId/recommendations
// ========================

export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id
    const { profile, monthlyAmount, includeExplanation } = req.body

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const financialContext = await getAccountFinancialContext(accountId, userId)

    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible' })
      return
    }

    const monthlyInvest = monthlyAmount || (financialContext.savingsCapacity * (financialContext.investmentPercentage / 100))

    const result = await ai.generateRecommendations(
      profile || (financialContext.investmentPercentage <= 10 ? 'conservative' : 
               financialContext.investmentPercentage >= 30 ? 'dynamic' : 'balanced'),
      monthlyInvest,
      financialContext
    )

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[Investment:Recommendations] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// GET /api/investment/:accountId/market-prices
// ========================

export const getMarketPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const data = await getMarketDataFull()

    res.status(200).json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[Investment:MarketPrices] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// POST /api/investment/:accountId/chat/session
// ========================

export const createChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const session = await InvestmentRepository.createChatSession({
      account_id: accountId,
      user_id: userId,
      provider: getActiveProvider()
    })

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        provider: session.provider,
        createdAt: session.created_at
      }
    })
  } catch (error) {
    console.error('[Investment:ChatSession] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// POST /api/investment/:accountId/chat/:sessionId/message
// ========================

export const sendChatMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, sessionId } = req.params
    const userId = (req as any).user?.id

    console.log('[Investment:ChatMessage] Starting...', { accountId, sessionId, userId })

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const validation = ChatMessageSchema.safeParse(req.body)
    if (!validation.success) {
      res.status(400).json({ success: false, error: 'Mensaje requerido' })
      return
    }

    const { message } = validation.data

    // Security check on user input
    const securityCheck = await checkInputSecurity(userId, message, {
      endpoint: '/chat/message',
      sessionId,
    })

    if (!securityCheck.allowed) {
      res.status(400).json({
        success: false,
        error: securityCheck.blockReason || 'Mensaje no permitido',
      })
      return
    }

    // Use sanitized message
    const safeMessage = securityCheck.sanitizedInput

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const session = await InvestmentRepository.getChatSessionById(sessionId)
    if (!session || session.account_id !== accountId) {
      res.status(404).json({ success: false, error: 'Sesión no encontrada' })
      return
    }

    const financialContext = await getAccountFinancialContext(accountId, userId)

    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible. Verifica la configuración.' })
      return
    }

    const result = await ai.chatWithSession(safeMessage, accountId, userId, financialContext)

    // Validate AI output
    const outputCheck = await checkOutputSecurity(userId, result.answer)
    const safeReply = outputCheck.safe ? result.answer : outputCheck.sanitizedOutput

    res.status(200).json({
      success: true,
      data: {
        reply: safeReply,
        relatedConcepts: result.relatedConcepts,
        needsDisclaimer: result.needsDisclaimer
      }
    })
  } catch (error) {
    console.error('[Investment:ChatMessage] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor'
    res.status(500).json({ success: false, error: errorMessage })
  }
}

// ========================
// GET /api/investment/:accountId/chat/:sessionId/history
// ========================

export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, sessionId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const session = await InvestmentRepository.getChatSessionById(sessionId)
    if (!session || session.account_id !== accountId) {
      res.status(404).json({ success: false, error: 'Sesión no encontrada' })
      return
    }

    const messages = await InvestmentRepository.getChatMessagesBySession(sessionId)

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.created_at
        })),
        messageCount: session.message_count,
        createdAt: session.created_at,
        lastMessageAt: session.last_message_at
      }
    })
  } catch (error) {
    console.error('[Investment:ChatHistory] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// GET /api/investment/:accountId/education?q=...
// ========================

export const explainConcept = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id
    const { q } = req.query

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    if (!q || typeof q !== 'string') {
      res.status(400).json({ success: false, error: 'Concepto requerido (q)' })
      return
    }

    // Security check on user input
    const securityCheck = await checkInputSecurity(userId, q, {
      endpoint: '/education',
    })

    if (!securityCheck.allowed) {
      res.status(400).json({
        success: false,
        error: securityCheck.blockReason || 'Consulta no permitida',
      })
      return
    }

    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible' })
      return
    }

    const result = await ai.explainConcept(securityCheck.sanitizedInput, 'beginner')

    // Validate output
    const outputCheck = await checkOutputSecurity(userId, result.explanation || '')

    res.status(200).json({
      success: true,
      data: {
        ...result,
        explanation: outputCheck.safe ? result.explanation : outputCheck.sanitizedOutput
      }
    })
  } catch (error) {
    console.error('[Investment:Education] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// GET /api/investment/:accountId/chat/sessions
// ========================

export const getChatSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const sessions = await InvestmentRepository.getChatSessionsByAccount(accountId)

    res.status(200).json({
      success: true,
      data: sessions.map(s => ({
        sessionId: s.id,
        provider: s.provider,
        messageCount: s.message_count,
        createdAt: s.created_at,
        lastMessageAt: s.last_message_at
      }))
    })
  } catch (error) {
    console.error('[Investment:ChatSessions] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}

// ========================
// DELETE /api/investment/:accountId/chat/:sessionId
// ========================

export const deleteChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountId, sessionId } = req.params
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    const session = await InvestmentRepository.getChatSessionById(sessionId)
    if (!session || session.account_id !== accountId) {
      res.status(404).json({ success: false, error: 'Sesión no encontrada' })
      return
    }

    // Delete messages first (cascade should handle it, but let's be safe)
    await InvestmentRepository.deleteChatMessagesBySession(sessionId)
    // Delete session
    await InvestmentRepository.deleteChatSession(sessionId)

    res.status(200).json({
      success: true,
      message: 'Sesión eliminada correctamente'
    })
  } catch (error) {
    console.error('[Investment:DeleteChatSession] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
  }
}
