// models/budget/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// BUDGET TYPES
// ============================================

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly'

export interface CategoryBudget {
  id: string
  account_id: string
  category_id: string
  amount: number
  period: BudgetPeriod
  alert_threshold: number
  created_at: Date
  updated_at?: Date
}

export interface CategoryBudgetRow extends RowDataPacket, CategoryBudget {}

// ============================================
// BUDGET DTOs
// ============================================

export interface CreateBudgetDTO {
  account_id: string
  category_id: string
  amount: number
  period?: BudgetPeriod
  alert_threshold?: number
}

export interface UpdateBudgetDTO {
  amount?: number
  period?: BudgetPeriod
  alert_threshold?: number
}
