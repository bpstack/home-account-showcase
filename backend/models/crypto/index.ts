// models/crypto/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// ACCOUNT KEY TYPES
// ============================================

export interface AccountKey {
  id: string
  account_id: string
  user_id: string
  encrypted_key: string
  key_version: number
  created_at: Date
}

export interface AccountKeyRow extends AccountKey, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateAccountKeyDTO {
  accountId: string
  userId: string
  encryptedKey: string
}

export interface UpdateAccountKeyDTO {
  accountId: string
  userId: string
  encryptedKey: string
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Encrypted key info returned to client after login
 */
export interface EncryptedKeyInfo {
  account_id: string
  encrypted_key: string
  key_version: number
}
