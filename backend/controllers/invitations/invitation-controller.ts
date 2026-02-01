// controllers/invitations/invitation-controller.ts

import type { Request, Response, NextFunction } from 'express'
import { InvitationRepository } from '../../repositories/invitations/invitation-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'

export class InvitationController {
  /**
   * POST /accounts/:id/invitations
   * Crear invitación (solo owner)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: accountId } = req.params
      const { email } = req.body
      const userId = req.user!.id

      if (!email) {
        return res.status(400).json({ error: 'Email es requerido' })
      }

      // Verificar que es owner
      const role = await AccountRepository.getUserRole(accountId, userId)
      if (role !== 'owner') {
        return res.status(403).json({ error: 'Solo el propietario puede invitar miembros' })
      }

      const invitation = await InvitationRepository.create({
        accountId,
        invitedBy: userId,
        email,
      })

      res.status(201).json({
        invitation,
        inviteLink: `/invite/${invitation.token}`,
      })
    } catch (error: any) {
      if (error.message === 'Este usuario ya es miembro de la cuenta') {
        return res.status(400).json({ error: error.message })
      }
      next(error)
    }
  }

  /**
   * GET /accounts/:id/invitations
   * Listar invitaciones de la cuenta (owner o member)
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: accountId } = req.params
      const userId = req.user!.id

      // Verificar acceso a la cuenta
      const hasAccess = await AccountRepository.hasAccess(accountId, userId)
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a esta cuenta' })
      }

      const invitations = await InvitationRepository.getByAccountId(accountId)

      res.json({ invitations })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /invitations/:token
   * Ver información de invitación (público - sin auth)
   */
  static async getByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params

      const invitation = await InvitationRepository.getByToken(token)

      if (!invitation) {
        return res.status(404).json({ error: 'Invitación no encontrada' })
      }

      // Verificar si expiró
      const isExpired =
        invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()

      res.json({
        invitation: {
          status: isExpired ? 'expired' : invitation.status,
          account_name: invitation.account_name,
          invited_by_name: invitation.invited_by_name,
          expires_at: invitation.expires_at,
        },
        isExpired,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * POST /invitations/:token/accept
   * Aceptar invitación (requiere auth)
   */
  static async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params
      const userId = req.user!.id

      const invitation = await InvitationRepository.accept({
        token,
        userId,
      })

      res.json({
        message: 'Invitación aceptada',
        invitation,
      })
    } catch (error: any) {
      if (
        error.message.includes('no encontrada') ||
        error.message.includes('expirado') ||
        error.message.includes('ya fue') ||
        error.message.includes('Ya eres miembro')
      ) {
        return res.status(400).json({ error: error.message })
      }
      next(error)
    }
  }

  /**
   * DELETE /accounts/:id/invitations/:invitationId
   * Revocar invitación (solo owner)
   */
  static async revoke(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: accountId, invitationId } = req.params
      const userId = req.user!.id

      // Verificar que es owner
      const role = await AccountRepository.getUserRole(accountId, userId)
      if (role !== 'owner') {
        return res.status(403).json({ error: 'Solo el propietario puede revocar invitaciones' })
      }

      const revoked = await InvitationRepository.revoke(invitationId, accountId)

      if (!revoked) {
        return res.status(404).json({ error: 'Invitación no encontrada o ya procesada' })
      }

      res.json({ message: 'Invitación revocada' })
    } catch (error) {
      next(error)
    }
  }
}
