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
  // Encrypted fields (optional during transition)
  description_encrypted?: string
  amount_encrypted?: string
  amount_sign?: 'positive' | 'negative' | 'zero'
  bank_category_encrypted?: string | null
  bank_subcategory_encrypted?: string | null
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

// DTO for encrypted transactions
export interface CreateEncryptedTransactionDTO {
  account_id: string
  date: string
  subcategory_id?: string | null
  // Encrypted fields
  description_encrypted: string
  amount_encrypted: string
  amount_sign: 'positive' | 'negative' | 'zero'
  bank_category_encrypted?: string | null
  bank_subcategory_encrypted?: string | null
}

export interface UpdateTransactionDTO {
  date?: string
  description?: string
  amount?: number
  subcategory_id?: string | null
}

// DTO for encrypted updates
export interface UpdateEncryptedTransactionDTO {
  date?: string
  subcategory_id?: string | null
  description_encrypted?: string
  amount_encrypted?: string
  amount_sign?: 'positive' | 'negative' | 'zero'
  bank_category_encrypted?: string | null
  bank_subcategory_encrypted?: string | null
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
