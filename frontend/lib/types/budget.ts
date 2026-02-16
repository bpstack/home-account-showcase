// lib/types/budget.ts

export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly'

export interface CategoryBudget {
  id: string
  account_id: string
  category_id: string
  amount: number
  period: BudgetPeriod
  alert_threshold: number
  created_at: string
  updated_at?: string
}

// Frontend-only type with spending calculation
export interface BudgetWithSpending extends CategoryBudget {
  categoryName: string
  categoryColor: string
  spent: number
  remaining: number
  percentage: number
  status: 'normal' | 'warning' | 'exceeded'
}

export interface CreateBudgetPayload {
  category_id: string
  amount: number
  period?: BudgetPeriod
  alert_threshold?: number
}

export interface UpdateBudgetPayload {
  amount?: number
  period?: BudgetPeriod
  alert_threshold?: number
}
