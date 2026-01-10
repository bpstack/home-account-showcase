// models/categories/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// CATEGORY TYPES
// ============================================

export interface Category {
  id: string
  account_id: string
  name: string
  color: string
  icon: string | null
  created_at: Date
  updated_at?: Date
}

export interface CategoryRow extends Category, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateCategoryDTO {
  account_id: string
  name: string
  color?: string
  icon?: string
}

export interface UpdateCategoryDTO {
  name?: string
  color?: string
  icon?: string
}
