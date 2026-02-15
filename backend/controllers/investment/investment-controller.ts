import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { createInvestmentAI } from '../../services/ai/investment-ai.js'
import { getActiveProvider } from '../../services/ai/ai-client.js'
import { getMarketData, getMarketDataFull } from '../../services/market/index.js'
import { InvestmentRepository } from '../../repositories/investment/investment-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import type {
  ProfileAnswers,
  InvestmentContext,
  ChatMessage,
} from '../../services/ai/prompts/types.js'
import {
  ProfileAnswersSchema,
  UpdateEmergencyFundMonthsSchema,
  UpdateLiquidityReserveSchema,
  ChatMessageSchema,
} from './validation.js'
import { checkInputSecurity, checkOutputSecurity } from '../../services/ai/security/index.js'

async function getAccountFinancialContext(
  accountId: string,
  userId: string
): Promise<InvestmentContext> {
  const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

  return {
    accountId,
    userId,
    avgMonthlyIncome: 0,
    avgMonthlyExpenses: 0,
    savingsCapacity: 0,
    savingsRate: 0,
    emergencyFundCurrent: investmentProfile?.liquidity_reserve || 0,
    emergencyFundGoal: 0,
    historicalMonths: 0,
    trend: 'stable',
    deficitMonths: 0,
    investmentPercentage: investmentProfile?.investment_percentage || 20,
    horizonYears: investmentProfile?.horizon_years || 5,
    experienceLevel:
      (investmentProfile?.experience_level as 'none' | 'basic' | 'intermediate' | 'advanced') ||
      'none',
    transactionCategories: {},
    recentTransactions: [],
  }
}

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const financialContext = await getAccountFinancialContext(accountId, userId)

  const investmentProfile = await InvestmentRepository.getProfileByAccountId(accountId)

  const marketData = await getMarketData()

  res.status(200).json({
    success: true,
    data: {
      accountId,
      profile: investmentProfile
        ? {
            riskProfile: investmentProfile.risk_profile,
            horizonYears: investmentProfile.horizon_years,
            hasEmergencyFund: investmentProfile.has_emergency_fund,
            investmentPercentage: investmentProfile.investment_percentage,
            monthlyInvestable: investmentProfile.monthly_investable,
            liquidityReserve: investmentProfile.liquidity_reserve,
            emergencyFundMonths: investmentProfile.emergency_fund_months,
          }
        : null,
      marketPrices: marketData,
      aiEnabled: true,
      activeProvider: getActiveProvider(),
    },
  })
})

export const updateEmergencyFundMonths = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const validation = UpdateEmergencyFundMonthsSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError('Meses debe ser un número entre 1 y 60', 400)
  }

  const { months } = validation.data

  await InvestmentRepository.upsertProfile({
    account_id: accountId,
    emergency_fund_months: months,
    risk_profile: 'balanced',
    investment_percentage: 20,
    has_emergency_fund: true,
    experience_level: 'none',
    horizon_years: 5,
  })

  res.status(200).json({
    success: true,
    message: 'Meses del fondo de emergencia actualizados',
  })
})

export const updateLiquidityReserve = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const validation = UpdateLiquidityReserveSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError('Monto debe ser un número positivo', 400)
  }

  const { amount } = validation.data

  await InvestmentRepository.upsertProfile({
    account_id: accountId,
    liquidity_reserve: amount,
    risk_profile: 'balanced',
    investment_percentage: 20,
    has_emergency_fund: true,
    experience_level: 'none',
    horizon_years: 5,
  })

  res.status(200).json({
    success: true,
    message: 'Fondo de emergencia actualizado',
  })
})

export const analyzeProfile = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id
  let answers = req.body as ProfileAnswers

  const decodeHtmlEntities = (str: string) =>
    str.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

  if (answers.horizonYears && typeof answers.horizonYears === 'string') {
    answers.horizonYears = decodeHtmlEntities(answers.horizonYears) as any
  }

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const validation = ProfileAnswersSchema.safeParse(answers)

  if (!validation.success) {
    const errors = validation.error.format()
    const fieldErrors: string[] = []
    for (const [field, err] of Object.entries(errors)) {
      if (field !== '_errors' && err && typeof err === 'object' && '_errors' in err) {
        const messages = (err as any)._errors
        if (messages?.length) {
          fieldErrors.push(`${field}: ${messages.join(', ')}`)
        }
      }
    }

    throw new AppError(
      fieldErrors.length > 0
        ? `Campos inválidos: ${fieldErrors.join('; ')}`
        : 'Datos de perfil inválidos',
      400
    )
  }

  const validAnswers = validation.data

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

  const ai = createInvestmentAI()
  if (!ai.isAvailable()) {
    throw new AppError('IA no disponible', 503)
  }

  const result = await ai.assessProfile(answers, financialContext)

  const profileMap: Record<string, 'conservative' | 'balanced' | 'dynamic'> = {
    conservador: 'conservative',
    conservative: 'conservative',
    equilibrado: 'balanced',
    balanced: 'balanced',
    dinámico: 'dynamic',
    dinamico: 'dynamic',
    dynamic: 'dynamic',
    agresivo: 'dynamic',
    aggressive: 'dynamic',
  }

  const dbProfile = profileMap[result.recommendedProfile?.toLowerCase()] || 'balanced'

  const horizonYearsMap: Record<string, number> = {
    '<3': 2,
    '3-10': 5,
    '>10': 15,
  }
  const horizonYearsNum = horizonYearsMap[answers.horizonYears] || 5

  await InvestmentRepository.upsertProfile({
    account_id: accountId,
    risk_profile: dbProfile,
    investment_percentage: result.investmentPercentage,
    has_emergency_fund: answers.hasEmergencyFund !== 'no',
    experience_level: answers.experienceLevel,
    horizon_years: horizonYearsNum,
  })

  res.status(200).json({
    success: true,
    data: result,
  })
})

export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id
  const { profile, monthlyAmount, includeExplanation } = req.body

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const financialContext = await getAccountFinancialContext(accountId, userId)

  const ai = createInvestmentAI()
  if (!ai.isAvailable()) {
    throw new AppError('IA no disponible', 503)
  }

  const monthlyInvest =
    monthlyAmount ||
    financialContext.savingsCapacity * (financialContext.investmentPercentage / 100)

  const result = await ai.generateRecommendations(
    profile ||
      (financialContext.investmentPercentage <= 10
        ? 'conservative'
        : financialContext.investmentPercentage >= 30
          ? 'dynamic'
          : 'balanced'),
    monthlyInvest,
    financialContext
  )

  res.status(200).json({
    success: true,
    data: result,
  })
})

export const getMarketPrices = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const data = await getMarketDataFull()

  res.status(200).json({
    success: true,
    data,
  })
})

export const createChatSession = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const session = await InvestmentRepository.createChatSession({
    account_id: accountId,
    user_id: userId,
    provider: getActiveProvider(),
  })

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      provider: session.provider,
      createdAt: session.created_at,
    },
  })
})

export const sendChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, sessionId } = req.params
  const userId = (req as any).user?.id

  console.log('[Investment:ChatMessage] Starting...', { accountId, sessionId, userId })

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const validation = ChatMessageSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError('Mensaje requerido', 400)
  }

  const { message } = validation.data

  const securityCheck = await checkInputSecurity(userId, message, {
    endpoint: '/chat/message',
    sessionId,
  })

  if (!securityCheck.allowed) {
    throw new AppError(securityCheck.blockReason || 'Mensaje no permitido', 400)
  }

  const safeMessage = securityCheck.sanitizedInput

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const session = await InvestmentRepository.getChatSessionById(sessionId)
  if (!session || session.account_id !== accountId) {
    throw new AppError('Sesión no encontrada', 404)
  }

  const financialContext = await getAccountFinancialContext(accountId, userId)

  const ai = createInvestmentAI()
  if (!ai.isAvailable()) {
    throw new AppError('IA no disponible. Verifica la configuración.', 503)
  }

  const result = await ai.chatWithSession(safeMessage, accountId, userId, financialContext)

  const outputCheck = await checkOutputSecurity(userId, result.answer)
  const safeReply = outputCheck.safe ? result.answer : outputCheck.sanitizedOutput

  res.status(200).json({
    success: true,
    data: {
      reply: safeReply,
      relatedConcepts: result.relatedConcepts,
      needsDisclaimer: result.needsDisclaimer,
    },
  })
})

export const getChatHistory = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, sessionId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const session = await InvestmentRepository.getChatSessionById(sessionId)
  if (!session || session.account_id !== accountId) {
    throw new AppError('Sesión no encontrada', 404)
  }

  const messages = await InvestmentRepository.getChatMessagesBySession(sessionId)

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
      messageCount: session.message_count,
      createdAt: session.created_at,
      lastMessageAt: session.last_message_at,
    },
  })
})

export const explainConcept = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id
  const { q } = req.query

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  if (!q || typeof q !== 'string') {
    throw new AppError('Concepto requerido (q)', 400)
  }

  const securityCheck = await checkInputSecurity(userId, q, {
    endpoint: '/education',
  })

  if (!securityCheck.allowed) {
    throw new AppError(securityCheck.blockReason || 'Consulta no permitida', 400)
  }

  const ai = createInvestmentAI()
  if (!ai.isAvailable()) {
    throw new AppError('IA no disponible', 503)
  }

  const result = await ai.explainConcept(securityCheck.sanitizedInput, 'beginner')

  const outputCheck = await checkOutputSecurity(userId, result.explanation || '')

  res.status(200).json({
    success: true,
    data: {
      ...result,
      explanation: outputCheck.safe ? result.explanation : outputCheck.sanitizedOutput,
    },
  })
})

export const getChatSessions = asyncHandler(async (req: Request, res: Response) => {
  const { accountId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const sessions = await InvestmentRepository.getChatSessionsByAccount(accountId)

  res.status(200).json({
    success: true,
    data: sessions.map((s) => ({
      sessionId: s.id,
      provider: s.provider,
      messageCount: s.message_count,
      createdAt: s.created_at,
      lastMessageAt: s.last_message_at,
    })),
  })
})

export const deleteChatSession = asyncHandler(async (req: Request, res: Response) => {
  const { accountId, sessionId } = req.params
  const userId = (req as any).user?.id

  if (!userId) {
    throw new AppError('No autorizado', 401)
  }

  const hasAccess = await AccountRepository.hasAccess(accountId, userId)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const session = await InvestmentRepository.getChatSessionById(sessionId)
  if (!session || session.account_id !== accountId) {
    throw new AppError('Sesión no encontrada', 404)
  }

  await InvestmentRepository.deleteChatMessagesBySession(sessionId)
  await InvestmentRepository.deleteChatSession(sessionId)

  res.status(200).json({
    success: true,
    message: 'Sesión eliminada correctamente',
  })
})
