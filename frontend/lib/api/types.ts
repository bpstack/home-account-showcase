// lib/api/types.ts - Tipos compartidos entre Server y Client

export interface TransactionStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
  incomeByType: Record<string, number>
}

export interface StatsResponse {
  success: boolean
  stats: TransactionStats
}

export interface CategorySummary {
  category_name: string
  category_color: string
  subcategory_name: string
  total_amount: number
  transaction_count: number
}

export interface SummaryResponse {
  success: boolean
  summary: CategorySummary[]
  total: number
}

export interface MonthlyData {
  month: string
  income: number
  expenses: number
  [key: string]: string | number
}

export interface MonthlySummaryResponse {
  success: boolean
  monthlySummary: MonthlyData[]
}

export interface BalanceHistoryData {
  date: string
  fullDate: string
  balance: number
  [key: string]: string | number
}

export interface BalanceHistoryResponse {
  success: boolean
  balanceHistory: BalanceHistoryData[]
}

export interface Category {
  id: string
  account_id: string
  name: string
  color: string
  icon: string | null
  created_at: string
  subcategories?: Subcategory[]
}

export interface Subcategory {
  id: string
  category_id: string
  name: string
  created_at: string
}

export interface CategoriesResponse {
  success: boolean
  categories: Category[]
}

export interface Transaction {
  id: string
  account_id: string
  subcategory_id: string | null
  date: string
  description: string
  amount: number
  bank_category: string | null
  bank_subcategory: string | null
  created_at: string
  subcategory_name?: string
  category_name?: string
  category_color?: string
}

export interface TransactionsResponse {
  success: boolean
  transactions: Transaction[]
  total: number
  limit: number
  offset: number
}

export interface Account {
  id: string
  name: string
  created_at: string
  role: string
}

export interface AccountsResponse {
  success: boolean
  accounts: Account[]
}

export interface User {
  id: string
  email: string
  name: string
}

export interface UserResponse {
  success: boolean
  user: User
}
