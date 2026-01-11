// models/subcategories/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// SUBCATEGORY TYPES
// ============================================

export interface Subcategory {
  id: string
  category_id: string
  name: string
  created_at: Date
  updated_at?: Date
}

export interface SubcategoryRow extends Subcategory, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateSubcategoryDTO {
  category_id: string
  name: string
}

export interface UpdateSubcategoryDTO {
  name?: string
}
