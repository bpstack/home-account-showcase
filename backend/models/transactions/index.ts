// models/transactions/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// TRANSACTION TYPES
// ============================================

export interface Transaction {
  id: string
  account_id: string
  subcategory_id: string | null
  date: Date
  description: string
  amount: number
  bank_category: string | null
  bank_subcategory: string | null
  created_at: Date
  updated_at?: Date
}

export interface TransactionRow extends Transaction, RowDataPacket {}

// ============================================
// TRANSACTION WITH DETAILS (JOINs)
// ============================================

export interface TransactionWithDetails extends Transaction {
  subcategory_name?: string
  subcategory_color?: string
  category_name?: string
  category_color?: string
}

export interface TransactionWithDetailsRow extends TransactionWithDetails, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateTransactionDTO {
  account_id: string
  date: string
  description: string
  amount: number
  subcategory_id?: string
  bank_category?: string
  bank_subcategory?: string
}

export interface UpdateTransactionDTO {
  date?: string
  description?: string
  amount?: number
  subcategory_id?: string | null
}

export interface TransactionFilters {
  account_id: string
  startDate?: string
  endDate?: string
  subcategory_id?: string
  minAmount?: number
  maxAmount?: number
  search?: string
  type?: 'income' | 'expense' | 'all'
  limit?: number
  offset?: number
}
