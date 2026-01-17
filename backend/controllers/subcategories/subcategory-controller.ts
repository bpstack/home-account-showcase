// controllers/subcategories/subcategory-controller.ts

import { Request, Response } from 'express'
import { SubcategoryRepository } from '../../repositories/subcategories/subcategory-repository.js'
import { sanitizeForStorage } from '../../utils/sanitize.js'

/**
 * Obtener subcategorías por categoría
 * GET /api/subcategories?category_id=xxx
 */
export const getSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id } = req.query

    if (!category_id || typeof category_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'category_id es requerido',
      })
      return
    }

    const subcategories = await SubcategoryRepository.getByCategoryId(category_id, req.user!.id)

    res.status(200).json({
      success: true,
      subcategories,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta categoría') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getSubcategories:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener subcategoría por ID
 * GET /api/subcategories/:id
 */
export const getSubcategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const subcategory = await SubcategoryRepository.getById(id, req.user!.id)

    if (!subcategory) {
      res.status(404).json({
        success: false,
        error: 'Subcategoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      subcategory,
    })
  } catch (error) {
    console.error('Error en getSubcategoryById:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Crear subcategoría
 * POST /api/subcategories
 */
export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category_id, name } = req.body

    if (!category_id || !name) {
      res.status(400).json({
        success: false,
        error: 'category_id y name son requeridos',
      })
      return
    }

    // Sanitize text fields to prevent XSS attacks
    const safeName = sanitizeForStorage(name)

    const subcategory = await SubcategoryRepository.create(req.user!.id, {
      category_id,
      name: safeName,
    })

    res.status(201).json({
      success: true,
      subcategory,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta categoría') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'Ya existe una subcategoría con ese nombre en esta categoría') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en createSubcategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Actualizar subcategoría
 * PUT /api/subcategories/:id
 */
export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name } = req.body

    // Sanitize text fields to prevent XSS attacks
    const safeName = name ? sanitizeForStorage(name) : undefined

    const subcategory = await SubcategoryRepository.update(id, req.user!.id, { name: safeName })

    if (!subcategory) {
      res.status(404).json({
        success: false,
        error: 'Subcategoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      subcategory,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Ya existe una subcategoría con ese nombre en esta categoría') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en updateSubcategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Eliminar subcategoría
 * DELETE /api/subcategories/:id
 */
export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const deleted = await SubcategoryRepository.delete(id, req.user!.id)

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Subcategoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Subcategoría eliminada correctamente',
    })
  } catch (error) {
    console.error('Error en deleteSubcategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
