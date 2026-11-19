// services/ai/prompts/types.ts
// Tipos compartidos para todos los prompts de inversión

import type { MarketDataContext } from '../../market/types.js'

export type { MarketDataContext }

// ========================
// CONTEXTO DE INVERSIÓN
// ========================

export interface InvestmentContext {
  // IDs (para logging)
  accountId: string
  userId: string

  // Métricas financieras calculadas
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  savingsCapacity: number
  savingsRate: number
  emergencyFundCurrent: number
  emergencyFundGoal: number // Mantenemos el campo pero no se usa en UI

  // Análisis histórico
  historicalMonths: number
  trend: 'improving' | 'stable' | 'declining'
  deficitMonths: number

  // Perfil
  investmentPercentage: number
  horizonYears: number
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'

  // Datos
  transactionCategories: Record<string, number>
  recentTransactions: Array<{
    description: string
    amount: number
    date: string
    category?: string
  }>
}

// ========================
// RESULTADOS DE PROMPTS
// ========================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatContext {
  accountId: string
  financialSummary: {
    avgMonthlyIncome: number
    savingsCapacity: number
    savingsRate: number
    emergencyFundCurrent: number
    emergencyFundGoal: number
    historicalMonths: number
    trend: 'improving' | 'stable' | 'declining'
  }
  investmentProfile?: {
    risk_profile: 'conservative' | 'balanced' | 'dynamic'
  }
  marketPrices: MarketDataContext
}

export interface ChatResult {
  answer: string
  relatedConcepts: string[]
  usedMarketData: boolean
  usedFinancialData: boolean
  needsDisclaimer: boolean
  suggestedFollowUp?: string
}

export interface EducationResult {
  concept: string
  summary: string
  explanation: string
  example: string
  risks: string[]
  relatedConcepts: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  timeToUnderstand: string
}

// ========================
// PROFILE ANSWERS
// ========================

// ========================
// SIMULATION
// ========================

export interface SimulationParams {
  initialAmount: number
  monthlyContribution: number
  profile: 'conservative' | 'balanced' | 'dynamic'
  years: number
}

export interface SimulationResult {
  projection: {
    conservative: number
    expected: number
    optimistic: number
  }
  assumptions: {
    conservativeReturn: number
    expectedReturn: number
    optimisticReturn: number
    inflation: number
  }
  chartData: Array<{
    year: number
    value: number
    contributions: number
  }>
  marketContext: string
}
