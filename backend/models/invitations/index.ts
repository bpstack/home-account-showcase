// models/invitations/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// INVITATION TYPES
// ============================================

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

export interface Invitation {
  id: string
  account_id: string
  invited_by: string
  email: string
  token: string
  status: InvitationStatus
  invited_user_id: string | null
  expires_at: Date
  created_at: Date
  accepted_at: Date | null
}

export interface InvitationRow extends Invitation, RowDataPacket {}

// ============================================
// INVITATION WITH DETAILS (for display)
// ============================================

export interface InvitationWithDetails extends Invitation {
  account_name: string
  invited_by_name: string
  invited_by_email: string
  encrypted_key: string | null // Account Key cifrada para transferir al invitado
  // Whether the accepting user is still in the account, and whether they already saved their own
  // copy of the key (MySQL returns EXISTS as 0/1)
  invitee_is_member: number
  invitee_has_key: number
}

export interface InvitationWithDetailsRow extends InvitationWithDetails, RowDataPacket {}

// ============================================
// DTOs
// ============================================

export interface CreateInvitationDTO {
  accountId: string
  invitedBy: string // userId del owner
  email: string
  encryptedKey?: string // Account Key cifrada con invitation secret
}

export interface AcceptInvitationDTO {
  token: string
  userId: string // usuario que acepta
}
