// models/accounts/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// ACCOUNT TYPES
// ============================================

export interface Account {
  id: string
  name: string
  created_at: Date
  updated_at?: Date
}

export interface AccountRow extends Account, RowDataPacket {}

// ============================================
// ACCOUNT_USER TYPES
// ============================================

export type AccountRole = 'owner' | 'member'

export interface AccountUser {
  id: string
  account_id: string
  user_id: string
  role: AccountRole
  created_at: Date
}

export interface AccountUserRow extends AccountUser, RowDataPacket {}

// ============================================
// ACCOUNT WITH ROLE (for user context)
// ============================================

export interface AccountWithRole extends Account {
  role: AccountRole
}

export interface AccountWithRoleRow extends AccountWithRole, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateAccountDTO {
  name: string
  userId: string // owner
}

export interface UpdateAccountDTO {
  name: string
}

export interface AddMemberDTO {
  accountId: string
  identifier: string // email o nombre del usuario
}
