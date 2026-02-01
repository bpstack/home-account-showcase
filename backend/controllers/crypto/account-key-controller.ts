// controllers/crypto/account-key-controller.ts

import { Request, Response, NextFunction } from 'express'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'

/**
 * POST /accounts/:id/keys
 * Guardar encrypted account key (después de aceptar invitación)
 */
export const saveAccountKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: accountId } = req.params
    const { encryptedKey } = req.body
    const userId = req.user!.id

    if (!encryptedKey) {
      res.status(400).json({ error: 'encryptedKey es requerido' })
      return
    }

    // Verificar que el usuario tiene acceso a la cuenta
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      res.status(403).json({ error: 'No tienes acceso a esta cuenta' })
      return
    }

    // Verificar si ya existe una key para este usuario/cuenta
    const existing = await AccountKeyRepository.getByAccountAndUser(accountId, userId)

    if (existing) {
      // Actualizar
      await AccountKeyRepository.update({ accountId, userId, encryptedKey })
    } else {
      // Crear
      await AccountKeyRepository.create({ accountId, userId, encryptedKey })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /auth/keys
 * Actualizar todas las encrypted keys (para cambio de password)
 */
export const updateAllKeys = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id
    const { updates } = req.body

    if (!Array.isArray(updates)) {
      res.status(400).json({ error: 'updates debe ser un array' })
      return
    }

    // Validar estructura
    for (const update of updates) {
      if (!update.accountId || !update.encryptedKey) {
        res.status(400).json({ error: 'Cada update debe tener accountId y encryptedKey' })
        return
      }
    }

    await AccountKeyRepository.updateAllForUser(userId, updates)

    res.status(200).json({ success: true })
  } catch (error) {
    next(error)
  }
}

/**
 * @deprecated Use getKeys from auth-controller instead (auth-routes.ts)
 * This endpoint was consolidated to return both key_salt and encrypted_keys
 * Kept here for reference only - no longer exported or used
 */
