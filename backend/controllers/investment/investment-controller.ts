// controllers/investment/investment-controller.ts
// Controlador del módulo de inversión

import { Request, Response } from 'express'
import { createInvestmentAI } from '../../services/ai/investment-ai.js'
import { getActiveProvider } from '../../services/ai/ai-client.js'
import { getMarketData, getMarketDataFull, getQuickSummary } from '../../services/market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { TransactionRepository } from '../../repositories/transactions/transaction-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import type { ProfileAnswers, InvestmentContext, ChatMessage } from '../../services/ai/prompts/types.js'

// ========================
// HELPER: Get account context (all historical transactions)
// ========================

async function getAccountFinancialContext(accountId: string, userId: string): Promise<InvestmentContext> {
  // Get all transactions (no limit - all historical)
  const transactions = await TransactionRepository.getByAccountId({
    account_id: accountId,
    limit: 10000 // High limit to get all
  }, userId)

  // Get account info
  const account = await AccountRepository.getById(accountId, userId)
  
  // Ensure amounts are numbers
  const safeTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount)
  }))

  // Calculate metrics
  const incomeTransactions = safeTransactions.filter(t => t.amount > 0)
  const expenseTransactions = safeTransactions.filter(t => t.amount < 0)

  const avgMonthlyIncome = incomeTransactions.length > 0
    ? incomeTransactions.reduce((sum, t) => sum + t.amount, 0) / Math.max(1, new Set(incomeTransactions.map(t => 
      new Date(t.date).toISOString().slice(0, 7)
    )).size)
    : 0

  const avgMonthlyExpenses = expenseTransactions.length > 0
    ? Math.abs(expenseTransactions.reduce((sum, t) => sum + t.amount, 0)) / Math.max(1, new Set(expenseTransactions.map(t => 
      new Date(t.date).toISOString().slice(0, 7)
    )).size)
    : 0

  const savingsCapacity = Math.max(0, avgMonthlyIncome - avgMonthlyExpenses)
  const savingsRate = avgMonthlyIncome > 0 ? (savingsCapacity / avgMonthlyIncome) * 100 : 0

  // Get investment profile if exists
  const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

  // Emergency fund months (default to 6)
  const emergencyFundMonths = investmentProfile?.emergency_fund_months || 6
  
  // Emergency fund goal - calculate as N months of savings capacity
  const emergencyFundGoal = savingsCapacity * emergencyFundMonths
  
  // Emergency fund status - use user's manual input (liquidity_reserve), default to 0
  const emergencyFundCurrent = investmentProfile?.liquidity_reserve || 0

  // Calculate trend
  const monthlySavings: Record<string, number> = {}
  safeTransactions.forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7)
    if (!monthlySavings[month]) monthlySavings[month] = 0
    monthlySavings[month] += t.amount
  })

  const savingsValues = Object.values(monthlySavings)
  const trend = savingsValues.length >= 2
    ? (savingsValues[savingsValues.length - 1] > savingsValues[0] ? 'improving' : 
       savingsValues[savingsValues.length - 1] < savingsValues[0] ? 'declining' : 'stable')
    : 'stable'

  const deficitMonths = savingsValues.filter(s => s < 0).length

  // Category distribution
  const categoryTotals: Record<string, number> = {}
  expenseTransactions.forEach(t => {
    const cat = t.category_name || 'Sin categoría'
    if (!categoryTotals[cat]) categoryTotals[cat] = 0
    categoryTotals[cat] += Math.abs(t.amount)
  })

  const totalExpenses = Object.values(categoryTotals).reduce((a, b) => a + b, 0)
  const categoryPercentages: Record<string, number> = {}
  Object.entries(categoryTotals).forEach(([cat, total]) => {
    categoryPercentages[cat] = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
  })

  return {
    accountId,
    userId,
    avgMonthlyIncome,
    avgMonthlyExpenses,
    savingsCapacity,
    savingsRate,
    emergencyFundCurrent,
    emergencyFundGoal,
    historicalMonths: Object.keys(monthlySavings).length,
    trend: trend as 'improving' | 'stable' | 'declining',
    deficitMonths,
    investmentPercentage: investmentProfile?.investment_percentage || 20,
    horizonYears: investmentProfile?.horizon_years || 5,
    experienceLevel: investmentProfile?.experience_level as 'none' | 'basic' | 'intermediate' | 'advanced' || 'none',
    transactionCategories: categoryPercentages,
    recentTransactions: transactions.slice(0, 50).map(t => ({
      description: t.description,
      amount: t.amount,
      date: t.date.toISOString(),
      category: t.category_name
    }))
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
        financialSummary: {
          avgMonthlyIncome: Math.round(financialContext.avgMonthlyIncome * 100) / 100,
          avgMonthlyExpenses: Math.round(financialContext.avgMonthlyExpenses * 100) / 100,
          savingsCapacity: Math.round(financialContext.savingsCapacity * 100) / 100,
          savingsRate: Math.round(financialContext.savingsRate * 100) / 100,
          emergencyFundStatus: Math.round(financialContext.emergencyFundCurrent * 100) / 100,
          emergencyFundGoal: Math.round(financialContext.emergencyFundGoal * 100) / 100,
          historicalMonths: financialContext.historicalMonths,
          trend: financialContext.trend,
          deficitMonths: financialContext.deficitMonths
        },
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
    const { months } = req.body

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    if (!months || months < 1 || months > 60) {
      res.status(400).json({ success: false, error: 'Meses debe ser un número entre 1 y 60' })
      return
    }

    await InvestmentRepository.updateProfile(accountId, {
      emergency_fund_months: months
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
    const { amount } = req.body

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    if (amount === undefined || amount === null || amount < 0) {
      res.status(400).json({ success: false, error: 'Monto debe ser un número positivo' })
      return
    }

    await InvestmentRepository.updateProfile(accountId, {
      liquidity_reserve: amount
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

    console.log('[Investment:AnalyzeProfile] Received body:', JSON.stringify(req.body))
    console.log('[Investment:AnalyzeProfile] Parsed answers:', answers)

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes acceso a esta cuenta' })
      return
    }

    // Validate answers - be flexible with values
    const ageValid = answers.age && Number(answers.age) > 0 && Number(answers.age) < 120
    const incomeValid = answers.monthlyIncome && Number(answers.monthlyIncome) > 0
    const jobValid = answers.jobStability && ['high', 'medium', 'low'].includes(answers.jobStability)
    const emergencyValid = answers.hasEmergencyFund && ['yes', 'partial', 'no'].includes(answers.hasEmergencyFund)
    const horizonValid = answers.horizonYears && ['short', 'medium', 'long'].includes(answers.horizonYears)
    const reactionValid = answers.reactionToDrop && ['sell', 'hold', 'buy_more'].includes(answers.reactionToDrop)
    const experienceValid = answers.experienceLevel && ['none', 'basic', 'intermediate', 'advanced'].includes(answers.experienceLevel)

    console.log('[Investment:AnalyzeProfile] Validation:')
    console.log('  ageValid:', ageValid, '(value:', answers.age, ')')
    console.log('  incomeValid:', incomeValid, '(value:', answers.monthlyIncome, ')')
    console.log('  jobValid:', jobValid, '(value:', answers.jobStability, ')')
    console.log('  emergencyValid:', emergencyValid, '(value:', answers.hasEmergencyFund, ')')
    console.log('  horizonValid:', horizonValid, '(value:', answers.horizonYears, ')')
    console.log('  reactionValid:', reactionValid, '(value:', answers.reactionToDrop, ')')
    console.log('  experienceValid:', experienceValid, '(value:', answers.experienceLevel, ')')

    if (!ageValid || !incomeValid || !jobValid || !emergencyValid || !horizonValid || !reactionValid || !experienceValid) {
      res.status(400).json({ success: false, error: 'Faltan respuestas requeridas' })
      return
    }

    // Get financial context
    const financialContext = await getAccountFinancialContext(accountId, userId)

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
      'dynamic': 'dynamic'
    }

    const dbProfile = profileMap[result.recommendedProfile] || 'balanced'

    // Save/update profile
    await InvestmentRepository.upsertProfile({
      account_id: accountId,
      risk_profile: dbProfile,
      investment_percentage: result.investmentPercentage,
      has_emergency_fund: answers.hasEmergencyFund !== 'no',
      experience_level: answers.experienceLevel
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
      profile || financialContext.investmentPercentage <= 10 ? 'conservative' : 
               financialContext.investmentPercentage >= 30 ? 'dynamic' : 'balanced',
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
    const { message } = req.body

    if (!userId) {
      res.status(401).json({ success: false, error: 'No autorizado' })
      return
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: 'Mensaje requerido' })
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

    const financialContext = await getAccountFinancialContext(accountId, userId)

    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible' })
      return
    }

    const result = await ai.chatWithSession(message, accountId, userId, financialContext)

    res.status(200).json({
      success: true,
      data: {
        reply: result.answer,
        relatedConcepts: result.relatedConcepts,
        needsDisclaimer: result.needsDisclaimer
      }
    })
  } catch (error) {
    console.error('[Investment:ChatMessage] Error:', error)
    res.status(500).json({ success: false, error: 'Error interno del servidor' })
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

    const ai = createInvestmentAI()
    if (!ai.isAvailable()) {
      res.status(503).json({ success: false, error: 'IA no disponible' })
      return
    }

    const result = await ai.explainConcept(q, 'beginner')

    res.status(200).json({
      success: true,
      data: result
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
