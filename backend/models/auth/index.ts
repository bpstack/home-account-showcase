// models/auth/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  name: string
  created_at: Date
  updated_at?: Date
}

export interface UserRow extends User, RowDataPacket {
  password_hash?: string
}

// ============================================
// AUTH DTOs
// ============================================

export interface RegisterDTO {
  email: string
  password: string
  name: string
}

export interface LoginDTO {
  email: string
  password: string
}

// ============================================
// TOKEN TYPES
// ============================================

export interface TokenPayload {
  id: string
  email: string
  iat?: number
  exp?: number
}

// ============================================
// API RESPONSES
// ============================================

export interface AuthResponse {
  success: boolean
  user?: User
  token?: string
  error?: string
}
