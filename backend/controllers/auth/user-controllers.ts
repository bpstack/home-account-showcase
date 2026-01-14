// controllers/auth/user-controllers.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import type { UpdateUserDTO } from '../../models/auth/index.js'

/**
 * Obtener todos los usuarios
 * GET /api/users
 */
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserRepository.getAll()
    res.status(200).json({ success: true, users })
  } catch (error) {
    console.error('Error getAllUsers:', error)
    res.status(500).json({ success: false, error: 'Error al recuperar usuarios' })
  }
}

/**
 * Obtener usuario por ID
 * GET /api/users/:id
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserRepository.getById(req.params.id)

    if (!user) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, user })
  } catch (error) {
    console.error('Error getUserById:', error)
    res.status(500).json({ success: false, error: 'Error al obtener usuario' })
  }
}

/**
 * Actualizar usuario por ID
 * PUT /api/users/:id
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email } = req.body as UpdateUserDTO

    const updatedUser = await UserRepository.update(req.params.id, { name, email })

    if (!updatedUser) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, user: updatedUser })
  } catch (error: any) {
    console.error('Error updateUser:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, error: 'El email ya está registrado' })
      return
    }
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' })
  }
}

/**
 * Eliminar usuario por ID
 * DELETE /api/users/:id
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await UserRepository.delete(req.params.id)

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error deleteUser:', error)
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' })
  }
}

/**
 * Reset de contraseña (admin)
 * POST /api/users/:id/reset-password
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' })
      return
    }

    const success = await UserRepository.resetPassword(req.params.id, newPassword)

    if (!success) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    console.error('Error resetUserPassword:', error)
    res.status(500).json({ success: false, error: 'Error al resetear contraseña' })
  }
}

/**
 * Cambiar contraseña propia
 * POST /api/users/:id/change-password
 */
export const changeUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Se requiere contraseña actual y nueva' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' })
      return
    }

    const success = await UserRepository.changePassword(req.params.id, currentPassword, newPassword)

    if (!success) {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' })
      return
    }

    res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error: any) {
    console.error('Error changeUserPassword:', error)
    if (error.message === 'Usuario no encontrado') {
      res.status(404).json({ success: false, error: error.message })
      return
    }
    if (error.message === 'Contraseña actual incorrecta') {
      res.status(401).json({ success: false, error: error.message })
      return
    }
    res.status(500).json({ success: false, error: 'Error al cambiar contraseña' })
  }
}
