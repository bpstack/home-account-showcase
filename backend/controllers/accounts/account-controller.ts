import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'

export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await AccountRepository.getByUserId(req.user!.id)

  res.status(200).json({
    success: true,
    accounts,
  })
})

export const getAccountById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const account = await AccountRepository.getById(id, req.user!.id)

  if (!account) {
    throw new AppError('Cuenta no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    account,
  })
})

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const { name, encryptedAccountKey } = req.body

  if (!name) {
    throw new AppError('El nombre es requerido', 400)
  }

  const result = await AccountRepository.createWithDefaults({
    name,
    userId: req.user!.id,
    encryptedAccountKey,
  })

  res.status(201).json({
    success: true,
    account: result.account,
    categoriesCopied: result.categoriesCopied,
  })
})

export const addDefaultCategories = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const role = await AccountRepository.getUserRole(id, req.user!.id)

  if (role !== 'owner') {
    throw new AppError('Solo el owner puede agregar categorías por defecto', 403)
  }

  const result = await AccountRepository.copyDefaultCategories(id)

  res.status(201).json({
    success: true,
    message: `Categorías agregadas: ${result.categories} categorías, ${result.subcategories} subcategorías`,
    ...result,
  })
})

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    throw new AppError('El nombre es requerido', 400)
  }

  const account = await AccountRepository.update(id, req.user!.id, { name })

  if (!account) {
    throw new AppError('Cuenta no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    account,
  })
})

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const deleted = await AccountRepository.delete(id, req.user!.id)

  if (!deleted) {
    throw new AppError('Cuenta no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    message: 'Cuenta eliminada correctamente',
  })
})

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const members = await AccountRepository.getMembers(id, req.user!.id)

  res.status(200).json({
    success: true,
    members,
  })
})

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, memberId } = req.params

  await AccountRepository.removeMember(id, req.user!.id, memberId)

  res.status(200).json({
    success: true,
    message: 'Miembro removido correctamente',
  })
})

export const leaveAccount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.user!.id

  await AccountRepository.leaveAccount(id, userId)

  res.status(200).json({
    success: true,
    message: 'Has abandonado la cuenta correctamente',
  })
})
