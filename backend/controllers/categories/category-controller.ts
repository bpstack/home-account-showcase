import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { CategoryRepository } from '../../repositories/categories/category-repository.js'
import { sanitizeForStorage } from '../../utils/sanitize.js'
import { createCategorySchema, updateCategorySchema } from '../../validators/category-validators.js'

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const categories = await CategoryRepository.getByAccountId(account_id, req.user!.id)

  res.status(200).json({
    success: true,
    categories,
  })
})

export const getCategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const category = await CategoryRepository.getById(id, req.user!.id)

  if (!category) {
    throw new AppError('Categoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    category,
  })
})

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = createCategorySchema.safeParse(req.body)
  
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { account_id, name, name_encrypted, color, icon } = result.data

  const safeName = sanitizeForStorage(name)

  const category = await CategoryRepository.create(req.user!.id, {
    account_id,
    name: safeName,
    name_encrypted,
    color,
    icon,
  })

  res.status(201).json({
    success: true,
    category,
  })
})

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const result = updateCategorySchema.safeParse(req.body)
  
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { name, name_encrypted, color, icon } = result.data

  const safeName = name ? sanitizeForStorage(name) : undefined

  const category = await CategoryRepository.update(id, req.user!.id, {
    name: safeName,
    name_encrypted,
    color,
    icon,
  })

  if (!category) {
    throw new AppError('Categoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    category,
  })
})

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const deleted = await CategoryRepository.delete(id, req.user!.id)

  if (!deleted) {
    throw new AppError('Categoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    message: 'Categoría eliminada correctamente',
  })
})

export const getOrphanedCount = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const count = await CategoryRepository.getOrphanedTransactionsCount(id, req.user!.id)

  res.status(200).json({
    success: true,
    count,
  })
})

export const reassignTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { id: fromCategoryId } = req.params
  const { to_category_id } = req.body

  if (!to_category_id) {
    throw new AppError('to_category_id es requerido', 400)
  }

  const count = await CategoryRepository.reassignTransactions(
    fromCategoryId,
    to_category_id,
    req.user!.id
  )

  res.status(200).json({
    success: true,
    message: `Transacciones reasignadas: ${count}`,
    reassignedCount: count,
  })
})
