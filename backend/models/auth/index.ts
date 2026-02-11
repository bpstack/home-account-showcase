// models/auth/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  name: string
  key_salt?: string // For encryption - only returned when needed
  oauth_provider?: 'local' | 'google' | 'github'
  oauth_id?: string
  avatar_url?: string
  created_at: Date
  updated_at?: Date
}

export interface UserRow extends User, RowDataPacket {
  password_hash?: string
  key_salt: string
  oauth_provider?: 'local' | 'google' | 'github'
  oauth_id?: string
  avatar_url?: string
}

// ============================================
// AUTH DTOs
// ============================================

export interface RegisterDTO {
  email: string
  password: string
  name: string
  accountName?: string
  skipDefaultAccount?: boolean // Para usuarios que vienen de invitación
  encryptedAccountKey?: string // Encrypted AK for the new account
}

export interface LoginDTO {
  email: string
  password: string
}

export interface UpdateUserDTO {
  name?: string
  email?: string
}

// OAuth types
export interface CreateOAuthUserDTO {
  email: string
  name: string
  provider: 'google' | 'github'
  oauthId: string
  avatar?: string
}

export interface LinkOAuthDTO {
  provider: 'google' | 'github'
  oauthId: string
  avatar?: string
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
  token?: string // @deprecated Usar accessToken
  accessToken?: string
  refreshToken?: string
  error?: string
}
