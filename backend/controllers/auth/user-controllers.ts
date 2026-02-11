import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import type { UpdateUserDTO } from '../../models/auth/index.js'

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await UserRepository.getAll()
  res.status(200).json({ success: true, users })
})

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserRepository.getById(req.params.id)

  if (!user) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, user })
})

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body as UpdateUserDTO

  const updatedUser = await UserRepository.update(req.params.id, { name, email })

  if (!updatedUser) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, user: updatedUser })
})

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await UserRepository.delete(req.params.id)

  if (!deleted) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' })
})

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = req.body

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres', 400)
  }

  const success = await UserRepository.resetPassword(req.params.id, newPassword)

  if (!success) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' })
})

export const changeUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    throw new AppError('Se requiere contraseña actual y nueva', 400)
  }

  if (newPassword.length < 6) {
    throw new AppError('La nueva contraseña debe tener al menos 6 caracteres', 400)
  }

  const success = await UserRepository.changePassword(req.params.id, currentPassword, newPassword)

  if (!success) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' })
})
