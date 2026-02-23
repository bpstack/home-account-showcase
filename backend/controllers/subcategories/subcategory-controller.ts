import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import { SubcategoryRepository } from '../../repositories/subcategories/subcategory-repository.js'
import { sanitizeForStorage } from '../../utils/sanitize.js'
import { createSubcategorySchema, updateSubcategorySchema } from '../../validators/category-validators.js'

export const getSubcategories = asyncHandler(async (req: Request, res: Response) => {
  const { category_id } = req.query

  if (!category_id || typeof category_id !== 'string') {
    throw new AppError('category_id es requerido', 400)
  }

  const subcategories = await SubcategoryRepository.getByCategoryId(category_id, req.user!.id)

  res.status(200).json({
    success: true,
    subcategories,
  })
})

export const getSubcategoryById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const subcategory = await SubcategoryRepository.getById(id, req.user!.id)

  if (!subcategory) {
    throw new AppError('Subcategoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    subcategory,
  })
})

export const createSubcategory = asyncHandler(async (req: Request, res: Response) => {
  const result = createSubcategorySchema.safeParse(req.body)
  
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { category_id, name, name_encrypted } = result.data

  const safeName = sanitizeForStorage(name)

  const subcategory = await SubcategoryRepository.create(req.user!.id, {
    category_id,
    name: safeName,
    name_encrypted,
  })

  res.status(201).json({
    success: true,
    subcategory,
  })
})

export const updateSubcategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const result = updateSubcategorySchema.safeParse(req.body)
  
  if (!result.success) {
    const messages = result.error.issues.map(i => i.message).join(', ')
    throw new AppError(messages, 400)
  }

  const { name, name_encrypted } = result.data

  const safeName = name ? sanitizeForStorage(name) : undefined

  const subcategory = await SubcategoryRepository.update(id, req.user!.id, {
    name: safeName,
    name_encrypted,
  })

  if (!subcategory) {
    throw new AppError('Subcategoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    subcategory,
  })
})

export const deleteSubcategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const deleted = await SubcategoryRepository.delete(id, req.user!.id)

  if (!deleted) {
    throw new AppError('Subcategoría no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    message: 'Subcategoría eliminada correctamente',
  })
})
