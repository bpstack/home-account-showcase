// repositories/invitations/invitation-repository.ts

import crypto from 'crypto'
import db from '../../config/db.js'
import type {
  Invitation,
  InvitationRow,
  InvitationWithDetails,
  InvitationWithDetailsRow,
  CreateInvitationDTO,
  AcceptInvitationDTO,
} from '../../models/invitations/index.js'

// Token de 64 caracteres hex (32 bytes)
const generateToken = () => crypto.randomBytes(32).toString('hex')

// Expiración: 24 horas desde ahora
const getExpirationDate = () => {
  const date = new Date()
  date.setHours(date.getHours() + 24)
  return date
}

export class InvitationRepository {
  /**
   * Crear invitación
   */
  static async create({ accountId, invitedBy, email }: CreateInvitationDTO): Promise<Invitation> {
    const id = crypto.randomUUID()
    const token = generateToken()
    const expiresAt = getExpirationDate()

    // Verificar si ya existe una invitación pending para este email en esta cuenta
    const [existing] = await db.query<InvitationRow[]>(
      `SELECT id, expires_at FROM invitations 
       WHERE account_id = ? AND email = ? AND status = 'pending'`,
      [accountId, email]
    )

    if (existing.length > 0) {
      // Actualizar expires_at de la existente (re-invitar)
      await db.query(`UPDATE invitations SET expires_at = ?, created_at = NOW() WHERE id = ?`, [
        expiresAt,
        existing[0].id,
      ])

      const [updated] = await db.query<InvitationRow[]>(`SELECT * FROM invitations WHERE id = ?`, [
        existing[0].id,
      ])
      return updated[0]
    }

    // Verificar si el usuario ya es miembro de la cuenta
    const [isMember] = await db.query<any[]>(
      `SELECT 1 FROM account_users au
       JOIN users u ON u.id = au.user_id
       WHERE au.account_id = ? AND u.email = ?`,
      [accountId, email]
    )

    if (isMember.length > 0) {
      throw new Error('Este usuario ya es miembro de la cuenta')
    }

    await db.query(
      `INSERT INTO invitations (id, account_id, invited_by, email, token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, accountId, invitedBy, email, token, expiresAt]
    )

    const [rows] = await db.query<InvitationRow[]>(`SELECT * FROM invitations WHERE id = ?`, [id])

    return rows[0]
  }

  /**
   * Obtener invitación por token (público - sin auth)
   */
  static async getByToken(token: string): Promise<InvitationWithDetails | null> {
    const [rows] = await db.query<InvitationWithDetailsRow[]>(
      `SELECT 
        i.*,
        a.name as account_name,
        u.name as invited_by_name,
        u.email as invited_by_email
       FROM invitations i
       JOIN accounts a ON a.id = i.account_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.token = ?`,
      [token]
    )

    return rows[0] || null
  }

  /**
   * Listar invitaciones de una cuenta
   */
  static async getByAccountId(accountId: string): Promise<Invitation[]> {
    const [rows] = await db.query<InvitationRow[]>(
      `SELECT * FROM invitations 
       WHERE account_id = ?
       ORDER BY created_at DESC`,
      [accountId]
    )

    return rows
  }

  /**
   * Aceptar invitación
   */
  static async accept({ token, userId }: AcceptInvitationDTO): Promise<Invitation> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Obtener invitación
      const [invitations] = await connection.query<InvitationRow[]>(
        `SELECT * FROM invitations WHERE token = ? FOR UPDATE`,
        [token]
      )

      const invitation = invitations[0]

      if (!invitation) {
        throw new Error('Invitación no encontrada')
      }

      if (invitation.status !== 'pending') {
        throw new Error(
          `La invitación ya fue ${invitation.status === 'accepted' ? 'aceptada' : invitation.status === 'revoked' ? 'revocada' : 'procesada'}`
        )
      }

      if (new Date(invitation.expires_at) < new Date()) {
        // Marcar como expired
        await connection.query(`UPDATE invitations SET status = 'expired' WHERE id = ?`, [
          invitation.id,
        ])
        throw new Error('La invitación ha expirado')
      }

      // Verificar que el email del usuario coincide con el email invitado
      const [users] = await connection.query<any[]>(`SELECT email FROM users WHERE id = ?`, [
        userId,
      ])

      if (!users[0] || users[0].email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error('Esta invitación es para otro email')
      }

      // Verificar que el usuario no sea ya miembro
      const [isMember] = await connection.query<any[]>(
        `SELECT 1 FROM account_users WHERE account_id = ? AND user_id = ?`,
        [invitation.account_id, userId]
      )

      if (isMember.length > 0) {
        throw new Error('Ya eres miembro de esta cuenta')
      }

      // Crear entrada en account_users
      const accountUserId = crypto.randomUUID()
      await connection.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'member')`,
        [accountUserId, invitation.account_id, userId]
      )

      // Actualizar invitación
      await connection.query(
        `UPDATE invitations 
         SET status = 'accepted', invited_user_id = ?, accepted_at = NOW()
         WHERE id = ?`,
        [userId, invitation.id]
      )

      await connection.commit()

      // Retornar invitación actualizada
      const [updated] = await db.query<InvitationRow[]>(`SELECT * FROM invitations WHERE id = ?`, [
        invitation.id,
      ])

      return updated[0]
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Revocar invitación (solo owner)
   */
  static async revoke(invitationId: string, accountId: string): Promise<boolean> {
    const [result] = await db.query<any>(
      `UPDATE invitations 
       SET status = 'revoked'
       WHERE id = ? AND account_id = ? AND status = 'pending'`,
      [invitationId, accountId]
    )

    return result.affectedRows > 0
  }

  /**
   * Marcar invitaciones expiradas (job/cron)
   */
  static async markExpired(): Promise<number> {
    const [result] = await db.query<any>(
      `UPDATE invitations 
       SET status = 'expired'
       WHERE status = 'pending' AND expires_at < NOW()`
    )

    return result.affectedRows
  }
}
