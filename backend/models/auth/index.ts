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
  email_verified?: boolean // Email verification status
  pending_email?: string | null // New email pending confirmation (email change flow)
}

export interface UserRow extends User, RowDataPacket {
  password_hash?: string
  key_salt: string
  verification_blob?: string | null
  recovery_blob?: string | null // UserKey encrypted with RecoveryKey
  recovery_salt?: string | null // Salt for BIP39 key derivation
  bip39_verified?: boolean // User confirmed they saved their phrase
  pin_attempts?: number // Server-side PIN lockout counter
  pin_locked_until?: Date | null // PIN lockout expiry
  bip39_attempts?: number // Server-side BIP39 lockout counter
  bip39_locked_until?: Date | null // BIP39 lockout expiry
  reset_token_hash?: string | null // Hash of password reset token
  reset_token_expires?: Date | null // Expiry of password reset token
  email_verified?: boolean // Email verification status
  verification_token?: string | null // Email verification token
  verification_token_expires?: Date | null // Email verification token expiry
  // Email change
  pending_email?: string | null // New email pending verification
  email_change_token?: string | null // Token for email change verification
  email_change_token_expires?: Date | null // Expiry of email change token
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
  verificationBlob?: string // Verification blob for PIN validation
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
