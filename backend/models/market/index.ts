// models/market/index.ts
// Types for market data module

import { RowDataPacket } from 'mysql2'

export interface InvestmentProfile {
  id: string
  account_id: string
  risk_profile: 'conservative' | 'balanced' | 'dynamic'
  investment_percentage: number
  horizon_years: number
  has_emergency_fund: boolean
  experience_level: 'none' | 'basic' | 'intermediate' | 'advanced'
  monthly_investable: number
  liquidity_reserve: number
  emergency_fund_months: number
  created_at: Date
  updated_at?: Date
}

export interface InvestmentProfileRow extends InvestmentProfile, RowDataPacket {}

export interface InvestmentSession {
  id: string
  account_id: string
  user_id: string
  type: 'profile_assessment' | 'recommendation' | 'simulation' | 'education'
  provider_used: string
  prompt_tokens?: number
  response_tokens?: number
  response_time_ms?: number
  cost_estimate?: number
  created_at: Date
}

export interface InvestmentSessionRow extends InvestmentSession, RowDataPacket {}

export interface AIChatSession {
  id: string
  account_id: string
  user_id: string
  provider: string
  message_count: number
  created_at: Date
  last_message_at?: Date
}

export interface AIChatSessionRow extends AIChatSession, RowDataPacket {}

export interface AIChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
  created_at: Date
}

export interface AIChatMessageRow extends AIChatMessage, RowDataPacket {}

export interface MarketDataCache {
  id: string
  symbol: string
  source: 'coingecko' | 'frankfurter' | 'alphavantage' | 'yahoo'
  data: string // JSON string
  cached_at: Date
  expires_at: Date
}

export interface MarketDataCacheRow extends MarketDataCache, RowDataPacket {}

// DTOs
export interface CreateInvestmentProfileDTO {
  account_id: string
  risk_profile?: 'conservative' | 'balanced' | 'dynamic'
  investment_percentage?: number
  horizon_years?: number
  has_emergency_fund?: boolean
  experience_level?: 'none' | 'basic' | 'intermediate' | 'advanced'
}

export interface UpdateInvestmentProfileDTO {
  risk_profile?: 'conservative' | 'balanced' | 'dynamic'
  investment_percentage?: number
  horizon_years?: number
  has_emergency_fund?: boolean
  experience_level?: 'none' | 'basic' | 'intermediate' | 'advanced'
  monthly_investable?: number
  liquidity_reserve?: number
  emergency_fund_months?: number
}

export interface CreateAIChatSessionDTO {
  account_id: string
  user_id: string
  provider: string
}

export interface CreateAIChatMessageDTO {
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
}
