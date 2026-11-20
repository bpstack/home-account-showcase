// lib/api/investment.ts
// API client for investment endpoints

// Usar proxy en cliente para evitar problemas de cookies cross-site
import { ApiError } from '../apiClient'

const isClient = typeof window !== 'undefined'
const API_URL = isClient ? '/api/proxy' : process.env.API_URL || 'http://localhost:3001/api'

async function investmentRequest<T>(
  endpoint: string,
  options?: globalThis.RequestInit
): Promise<T> {
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
    throw new ApiError(response.status, data.error || 'Error del servidor')
  }
  return data
}

// FinancialSummary interface moved to hooks/useFinancialMetrics.ts

/** The result of the profile test; null in the overview until it is taken */
export interface InvestmentProfile {
  riskProfile: 'conservative' | 'balanced' | 'dynamic'
  horizonYears: number
}

/** The emergency fund, test or not: what is saved and how many months of expenses it should cover */
export interface EmergencyFundSettings {
  saved: number
  months: number
}

/** A price and its daily change; the change is null when the source does not give it */
export interface Quote {
  value: number
  change24h: number | null
}

/** A percentage published for a period: a month ("2026-10") or a day ("2026-11-19") */
export interface Indicator {
  value: number
  period: string
}

/** How the economy is doing; each indicator is null when its source did not answer */
export interface Economy {
  /** Annual HICP inflation in Spain, % (Eurostat) */
  inflationSpain: Indicator | null
  /** 12-month Euribor, monthly average, % (ECB) */
  euribor12m: Indicator | null
  /** ECB deposit facility rate, % (ECB) */
  ecbDepositRate: Indicator | null
  /** Unemployment rate in Spain, seasonally adjusted, % (Eurostat) */
  unemploymentSpain: Indicator | null
}

/** Each figure is null when its source did not answer: there are no fallback figures */
export interface MarketPrices {
  btc: Quote | null
  eth: Quote | null
  eurUsd: Quote | null
  eurGbp: Quote | null
  lastUpdated: string
  economy: Economy
}

export interface InvestmentOverview {
  accountId: string
  // Financial summary removed - calculated client-side
  profile: InvestmentProfile | null
  emergencyFund: EmergencyFundSettings
  marketPrices: MarketPrices
  aiEnabled: boolean
  activeProvider: string
}

export interface ProfileAnswers {
  age: number
  monthlyIncome: number
  jobStability: 'high' | 'medium' | 'low'
  horizonYears: '<3' | '3-10' | '>10'
  reactionToDrop: 'sell' | 'hold' | 'buy_more'
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
  financialMetrics?: {
    avgMonthlyIncome: number
    avgMonthlyExpenses: number
    savingsCapacity: number
    savingsRate: number
    historicalMonths: number
    trend: 'improving' | 'stable' | 'declining'
    deficitMonths: number
  }
}

export interface ProfileAssessmentResult {
  recommendedProfile: 'conservative' | 'balanced' | 'dynamic'
  /** Risk tolerance points, 0 to maxScore, and the points range of the profile given */
  score: number
  maxScore: number
  scoreRange: { min: number; max: number }
  confidence: number
  reasoning: string
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

/** Every row is always there; a figure its source did not give is null */
export interface MarketDataResponse {
  cryptocurrencies: Array<{
    symbol: string
    name: string
    price: number | null
    change24h: number | null
  }>
  currencies: Array<{
    pair: string
    rate: number | null
    change24h: number | null
  }>
  economy: Economy
  /** When the quotes were fetched; each economic figure carries its own period */
  cachedAt: string
  cacheExpiresIn: number
  /** null when no change is known */
  marketTrend: 'alcista' | 'bajista' | 'neutral' | null
}

// ========================
// Investment API
// ========================

export const investmentApi = {
  // Get overview
  getOverview: async (accountId: string): Promise<InvestmentOverview> => {
    const data = await investmentRequest<{ data: InvestmentOverview }>(
      `/investment/${accountId}/overview`
    )
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
  analyzeProfile: async (
    accountId: string,
    answers: ProfileAnswers
  ): Promise<ProfileAssessmentResult> => {
    const data = await investmentRequest<{ data: ProfileAssessmentResult }>(
      `/investment/${accountId}/analyze-profile`,
      {
        method: 'POST',
        body: JSON.stringify(answers),
      }
    )
    return data.data
  },

  // Get market prices
  getMarketPrices: async (accountId: string): Promise<MarketDataResponse> => {
    const data = await investmentRequest<{ data: MarketDataResponse }>(
      `/investment/${accountId}/market-prices`
    )
    return data.data
  },

  // Chat - create session
  createChatSession: async (accountId: string): Promise<ChatSession> => {
    const data = await investmentRequest<{ data: ChatSession }>(
      `/investment/${accountId}/chat/session`,
      {
        method: 'POST',
      }
    )
    return data.data
  },

  // Chat - send message
  sendChatMessage: async (
    accountId: string,
    sessionId: string,
    message: string
  ): Promise<ChatResponse> => {
    const data = await investmentRequest<{ data: ChatResponse }>(
      `/investment/${accountId}/chat/${sessionId}/message`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    )
    return data.data
  },

  // Chat - get history
  getChatHistory: async (
    accountId: string,
    sessionId: string
  ): Promise<{
    sessionId: string
    messages: ChatMessage[]
    messageCount: number
    createdAt: string
    lastMessageAt?: string
  }> => {
    const data = await investmentRequest<{ data: any }>(
      `/investment/${accountId}/chat/${sessionId}/history`
    )
    return data.data
  },

  // Chat - get all sessions
  getChatSessions: async (
    accountId: string
  ): Promise<
    Array<{
      sessionId: string
      provider: string
      messageCount: number
      createdAt: string
      lastMessageAt?: string
    }>
  > => {
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
    const data = await investmentRequest<{ data: any }>(
      `/investment/${accountId}/education?q=${encodeURIComponent(concept)}`
    )
    return data.data
  },
}
