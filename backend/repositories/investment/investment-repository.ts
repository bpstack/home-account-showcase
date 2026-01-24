// repositories/investment/investment-repository.ts
// Repository for investment module tables

import db from '../../config/db.js'
import crypto from 'crypto'
import type {
  InvestmentProfile,
  InvestmentProfileRow,
  InvestmentSession,
  InvestmentSessionRow,
  AIChatSession,
  AIChatSessionRow,
  AIChatMessage,
  AIChatMessageRow,
  CreateInvestmentProfileDTO,
  UpdateInvestmentProfileDTO,
  CreateAIChatSessionDTO,
  CreateAIChatMessageDTO
} from '../../models/market/index.js'

export class InvestmentRepository {
  // ========================
  // INVESTMENT PROFILES
  // ========================

  static async getProfileByAccountId(accountId: string): Promise<InvestmentProfile | null> {
    const [rows] = await db.query<InvestmentProfileRow[]>(
      `SELECT id, account_id, risk_profile, investment_percentage, horizon_years,
              has_emergency_fund, experience_level, monthly_investable, liquidity_reserve,
              emergency_fund_months, created_at, updated_at
       FROM investment_profiles
       WHERE account_id = ?`,
      [accountId]
    )
    return rows[0] || null
  }

  static async createProfile(data: CreateInvestmentProfileDTO): Promise<InvestmentProfile> {
    const [result] = await db.query(
      `INSERT INTO investment_profiles
       (account_id, risk_profile, investment_percentage, horizon_years, has_emergency_fund, experience_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.account_id,
        data.risk_profile || 'balanced',
        data.investment_percentage || 20,
        data.horizon_years || 5,
        data.has_emergency_fund || false,
        data.experience_level || 'none'
      ]
    )

    return this.getProfileByAccountId(data.account_id) as Promise<InvestmentProfile>
  }

  static async updateProfile(
    accountId: string,
    data: UpdateInvestmentProfileDTO
  ): Promise<InvestmentProfile | null> {
    const updates: string[] = []
    const values: any[] = []

    if (data.risk_profile !== undefined) {
      updates.push('risk_profile = ?')
      values.push(data.risk_profile)
    }
    if (data.investment_percentage !== undefined) {
      updates.push('investment_percentage = ?')
      values.push(data.investment_percentage)
    }
    if (data.horizon_years !== undefined) {
      updates.push('horizon_years = ?')
      values.push(data.horizon_years)
    }
    if (data.has_emergency_fund !== undefined) {
      updates.push('has_emergency_fund = ?')
      values.push(data.has_emergency_fund)
    }
    if (data.experience_level !== undefined) {
      updates.push('experience_level = ?')
      values.push(data.experience_level)
    }
    if (data.monthly_investable !== undefined) {
      updates.push('monthly_investable = ?')
      values.push(data.monthly_investable)
    }
    if (data.liquidity_reserve !== undefined) {
      updates.push('liquidity_reserve = ?')
      values.push(data.liquidity_reserve)
    }
    if (data.emergency_fund_months !== undefined) {
      updates.push('emergency_fund_months = ?')
      values.push(data.emergency_fund_months)
    }

    if (updates.length === 0) {
      return this.getProfileByAccountId(accountId)
    }

    updates.push('updated_at = NOW()')
    values.push(accountId)

    await db.query(
      `UPDATE investment_profiles SET ${updates.join(', ')} WHERE account_id = ?`,
      values
    )

    return this.getProfileByAccountId(accountId)
  }

  static async upsertProfile(data: CreateInvestmentProfileDTO): Promise<InvestmentProfile> {
    const existing = await this.getProfileByAccountId(data.account_id)
    if (existing) {
      return this.updateProfile(data.account_id, data as UpdateInvestmentProfileDTO) as Promise<InvestmentProfile>
    }
    return this.createProfile(data)
  }

  // ========================
  // INVESTMENT SESSIONS
  // ========================

  static async createSession(data: {
    accountId: string
    userId: string
    type: 'profile_assessment' | 'recommendation' | 'simulation' | 'education'
    providerUsed: string
    promptTokens?: number
    responseTokens?: number
    responseTimeMs?: number
    costEstimate?: number
  }): Promise<string> {
    const id = crypto.randomUUID()
    await db.query(
      `INSERT INTO investment_sessions
       (id, account_id, user_id, type, provider_used, prompt_tokens, response_tokens, response_time_ms, cost_estimate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.accountId,
        data.userId,
        data.type,
        data.providerUsed,
        data.promptTokens || null,
        data.responseTokens || null,
        data.responseTimeMs || null,
        data.costEstimate || null
      ]
    )

    return id
  }

  static async getSessionsByAccount(
    accountId: string,
    limit: number = 100
  ): Promise<InvestmentSession[]> {
    const [rows] = await db.query<InvestmentSessionRow[]>(
      `SELECT id, account_id, user_id, type, provider_used, prompt_tokens, response_tokens,
              response_time_ms, cost_estimate, created_at
       FROM investment_sessions
       WHERE account_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [accountId, limit]
    )
    return rows
  }

  static async getSessionsByUser(
    userId: string,
    limit: number = 100
  ): Promise<InvestmentSession[]> {
    const [rows] = await db.query<InvestmentSessionRow[]>(
      `SELECT id, account_id, user_id, type, provider_used, prompt_tokens, response_tokens,
              response_time_ms, cost_estimate, created_at
       FROM investment_sessions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    )
    return rows
  }

  // ========================
  // AI CHAT SESSIONS
  // ========================

  static async createChatSession(data: CreateAIChatSessionDTO): Promise<AIChatSession> {
    const id = crypto.randomUUID()
    await db.query(
      `INSERT INTO ai_chat_sessions (id, account_id, user_id, provider)
       VALUES (?, ?, ?, ?)`,
      [id, data.account_id, data.user_id, data.provider]
    )

    return this.getChatSessionById(id) as Promise<AIChatSession>
  }

  static async getChatSessionById(id: string): Promise<AIChatSession | null> {
    const [rows] = await db.query<AIChatSessionRow[]>(
      `SELECT id, account_id, user_id, provider, message_count, created_at, last_message_at
       FROM ai_chat_sessions
       WHERE id = ?`,
      [id]
    )
    return rows[0] || null
  }

  static async getChatSessionsByAccount(accountId: string): Promise<AIChatSession[]> {
    const [rows] = await db.query<AIChatSessionRow[]>(
      `SELECT id, account_id, user_id, provider, message_count, created_at, last_message_at
       FROM ai_chat_sessions
       WHERE account_id = ?
       ORDER BY last_message_at DESC
       LIMIT 50`,
      [accountId]
    )
    return rows
  }

  static async updateChatSession(
    sessionId: string,
    messageCount: number
  ): Promise<void> {
    await db.query(
      `UPDATE ai_chat_sessions
       SET message_count = ?, last_message_at = NOW()
       WHERE id = ?`,
      [messageCount, sessionId]
    )
  }

  static async deleteChatSession(sessionId: string): Promise<boolean> {
    const [result] = await db.query(`DELETE FROM ai_chat_sessions WHERE id = ?`, [sessionId])
    return (result as any).affectedRows > 0
  }

  // ========================
  // AI CHAT MESSAGES
  // ========================

  static async addChatMessage(data: CreateAIChatMessageDTO): Promise<AIChatMessage> {
    const id = crypto.randomUUID()
    await db.query(
      `INSERT INTO ai_chat_messages (id, session_id, role, content, tokens)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.session_id, data.role, data.content, data.tokens || null]
    )

    return this.getChatMessageById(id) as Promise<AIChatMessage>
  }

  static async getChatMessageById(id: string): Promise<AIChatMessage | null> {
    const [rows] = await db.query<AIChatMessageRow[]>(
      `SELECT id, session_id, role, content, tokens, created_at
       FROM ai_chat_messages
       WHERE id = ?`,
      [id]
    )
    return rows[0] || null
  }

  static async getChatMessagesBySession(
    sessionId: string,
    limit: number = 50
  ): Promise<AIChatMessage[]> {
    const [rows] = await db.query<AIChatMessageRow[]>(
      `SELECT id, session_id, role, content, tokens, created_at
       FROM ai_chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [sessionId, limit]
    )
    return rows
  }

  static async getChatMessagesForContext(
    sessionId: string,
    limit: number = 20
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getChatMessagesBySession(sessionId, limit)
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  }

  static async deleteChatMessagesBySession(sessionId: string): Promise<number> {
    const [result] = await db.query(`DELETE FROM ai_chat_messages WHERE session_id = ?`, [sessionId])
    return (result as any).affectedRows
  }
}
