// services/ai/prompts/types.ts
// Tipos compartidos para todos los prompts de inversión

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

export interface MarketDataContext {
  sp500: { value: number; change24h: number }
  msciWorld: { value: number; change24h: number }
  nasdaq: { value: number; change24h: number }
  btc: { value: number; change24h: number }
  eth: { value: number; change24h: number }
  eurUsd: number
  eurGbp: number
}

// ========================
// RESULTADOS DE PROMPTS
// ========================

export interface ProfileAssessmentResult {
  recommendedProfile: 'conservative' | 'balanced' | 'dynamic'
  confidence: number
  reasoning: string
  investmentPercentage: number
  monthlyInvestable: number
  liquidityReserve: number
  historicalInsights: {
    monthsAnalyzed: number
    trend: string
    bestMonth: string
    worstMonth: string
    savingsConsistency: string
  }
  warnings: string[]
  marketContext: string
}

export interface RecommendationItem {
  type: 'ETF' | 'BOND_FUND' | 'CRYPTO' | 'STOCK' | 'SAVINGS'
  symbol: string
  name: string
  percentage: number
  amount: number
  currentPrice?: number
  units?: number
  reason: string
  risk: 'low' | 'medium' | 'high'
}

export interface RecommendationResult {
  recommendations: RecommendationItem[]
  totalMonthly: number
  assetAllocation: {
    stocks: number
    bonds: number
    crypto: number
    cash: number
  }
  marketContext: string
  disclaimer: string
}

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

export interface ProfileAnswers {
  age: number
  monthlyIncome: number
  jobStability: 'high' | 'medium' | 'low'
  hasEmergencyFund: 'yes' | 'partial' | 'no'
  horizonYears: 'short' | 'medium' | 'long'
  reactionToDrop: 'sell' | 'hold' | 'buy_more'
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
}

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
