// lib/api/investment.ts
// API client for investment endpoints

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

async function investmentRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Error del servidor')
  }
  return data
}

export interface FinancialSummary {
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  savingsCapacity: number
  savingsRate: number
  emergencyFundStatus: number
  emergencyFundGoal: number
  historicalMonths: number
  trend: 'improving' | 'stable' | 'declining'
  deficitMonths: number
}

export interface InvestmentProfile {
  riskProfile: 'conservative' | 'balanced' | 'dynamic'
  horizonYears: number
  hasEmergencyFund: boolean
  investmentPercentage: number
  monthlyInvestable: number
  liquidityReserve: number
  emergencyFundMonths: number
}

export interface MarketPrices {
  sp500: { value: number; change24h: number }
  msciWorld: { value: number; change24h: number }
  nasdaq: { value: number; change24h: number }
  btc: { value: number; change24h: number }
  eth: { value: number; change24h: number }
  eurUsd: number
  eurGbp: number
  lastUpdated: string
}

export interface InvestmentOverview {
  accountId: string
  financialSummary: FinancialSummary
  profile: InvestmentProfile | null
  marketPrices: MarketPrices
  aiEnabled: boolean
  activeProvider: string
}

export interface ProfileAnswers {
  age: number
  monthlyIncome: number
  jobStability: 'high' | 'medium' | 'low'
  hasEmergencyFund: 'yes' | 'partial' | 'no'
  horizonYears: '<3' | '3-10' | '>10'
  reactionToDrop: 'sell' | 'hold' | 'buy_more'
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
}

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

export interface ChatSession {
  sessionId: string
  provider: string
  createdAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: string
}

export interface ChatResponse {
  reply: string
  relatedConcepts: string[]
  needsDisclaimer: boolean
}

export interface MarketDataResponse {
  cryptocurrencies: Array<{
    symbol: string
    name: string
    price: number
    change24h: number
  }>
  currencies: Array<{
    pair: string
    rate: number
    change24h: number
  }>
  indices: Array<{
    symbol: string
    name: string
    value: number
    change24h: number
  }>
  cachedAt: string
  cacheExpiresIn: number
  marketTrend?: 'alcista' | 'bajista' | 'neutral'
}

// ========================
// Investment API
// ========================

export const investmentApi = {
  // Get overview
  getOverview: async (accountId: string): Promise<InvestmentOverview> => {
    const data = await investmentRequest<{ data: InvestmentOverview }>(`/investment/${accountId}/overview`)
    return data.data
  },

  // Update emergency fund months
  updateEmergencyFundMonths: async (accountId: string, months: number): Promise<void> => {
    await investmentRequest(`/investment/${accountId}/emergency-fund-months`, {
      method: 'PATCH',
      body: JSON.stringify({ months }),
    })
  },

  // Update liquidity reserve (actual emergency fund amount)
  updateLiquidityReserve: async (accountId: string, amount: number): Promise<void> => {
    await investmentRequest(`/investment/${accountId}/liquidity-reserve`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    })
  },

  // Analyze profile
  analyzeProfile: async (accountId: string, answers: ProfileAnswers): Promise<ProfileAssessmentResult> => {
    const data = await investmentRequest<{ data: ProfileAssessmentResult }>(`/investment/${accountId}/analyze-profile`, {
      method: 'POST',
      body: JSON.stringify(answers),
    })
    return data.data
  },

  // Get recommendations
  getRecommendations: async (
    accountId: string,
    options?: { profile?: string; monthlyAmount?: number; includeExplanation?: boolean }
  ): Promise<RecommendationResult> => {
    const data = await investmentRequest<{ data: RecommendationResult }>(`/investment/${accountId}/recommendations`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    })
    return data.data
  },

  // Get market prices
  getMarketPrices: async (accountId: string): Promise<MarketDataResponse> => {
    const data = await investmentRequest<{ data: MarketDataResponse }>(`/investment/${accountId}/market-prices`)
    return data.data
  },

  // Chat - create session
  createChatSession: async (accountId: string): Promise<ChatSession> => {
    const data = await investmentRequest<{ data: ChatSession }>(`/investment/${accountId}/chat/session`, {
      method: 'POST',
    })
    return data.data
  },

  // Chat - send message
  sendChatMessage: async (accountId: string, sessionId: string, message: string): Promise<ChatResponse> => {
    const data = await investmentRequest<{ data: ChatResponse }>(`/investment/${accountId}/chat/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
    return data.data
  },

  // Chat - get history
  getChatHistory: async (accountId: string, sessionId: string): Promise<{
    sessionId: string
    messages: ChatMessage[]
    messageCount: number
    createdAt: string
    lastMessageAt?: string
  }> => {
    const data = await investmentRequest<{ data: any }>(`/investment/${accountId}/chat/${sessionId}/history`)
    return data.data
  },

  // Chat - get all sessions
  getChatSessions: async (accountId: string): Promise<Array<{
    sessionId: string
    provider: string
    messageCount: number
    createdAt: string
    lastMessageAt?: string
  }>> => {
    const data = await investmentRequest<{ data: any[] }>(`/investment/${accountId}/chat/sessions`)
    return data.data
  },

  // Chat - delete session
  deleteChatSession: async (accountId: string, sessionId: string): Promise<void> => {
    await investmentRequest(`/investment/${accountId}/chat/${sessionId}`, {
      method: 'DELETE',
    })
  },

  // Education - explain concept
  explainConcept: async (accountId: string, concept: string): Promise<any> => {
    const data = await investmentRequest<{ data: any }>(`/investment/${accountId}/education?q=${encodeURIComponent(concept)}`)
    return data.data
  }
}
