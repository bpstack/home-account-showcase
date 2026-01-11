// controllers/categories/category-controller.ts

import { Request, Response } from 'express'
import { CategoryRepository } from '../../repositories/categories/category-repository.js'

/**
 * Obtener categorías por account
 * GET /api/categories?account_id=xxx
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_id } = req.query

    if (!account_id || typeof account_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'account_id es requerido',
      })
      return
    }

    const categories = await CategoryRepository.getByAccountId(account_id, req.user!.id)

    res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getCategories:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener categoría por ID
 * GET /api/categories/:id
 */
export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const category = await CategoryRepository.getById(id, req.user!.id)

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Categoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      category,
    })
  } catch (error) {
    console.error('Error en getCategoryById:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Crear categoría
 * POST /api/categories
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_id, name, color, icon } = req.body

    if (!account_id || !name) {
      res.status(400).json({
        success: false,
        error: 'account_id y name son requeridos',
      })
      return
    }

    const category = await CategoryRepository.create(req.user!.id, {
      account_id,
      name,
      color,
      icon,
    })

    res.status(201).json({
      success: true,
      category,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'Ya existe una categoría con ese nombre') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en createCategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Actualizar categoría
 * PUT /api/categories/:id
 */
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, color, icon } = req.body

    const category = await CategoryRepository.update(id, req.user!.id, {
      name,
      color,
      icon,
    })

    if (!category) {
      res.status(404).json({
        success: false,
        error: 'Categoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      category,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Ya existe una categoría con ese nombre') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en updateCategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Eliminar categoría
 * DELETE /api/categories/:id
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const deleted = await CategoryRepository.delete(id, req.user!.id)

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Categoría no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Categoría eliminada correctamente',
    })
  } catch (error) {
    console.error('Error en deleteCategory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener transacciones huérfanas al borrar categoría
 * GET /api/categories/:id/orphaned-count
 */
export const getOrphanedCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const count = await CategoryRepository.getOrphanedTransactionsCount(id, req.user!.id)

    res.status(200).json({
      success: true,
      count,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getOrphanedCount:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Reasignar transacciones a otra subcategoría
 * POST /api/categories/:id/reassign
 */
export const reassignTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: fromCategoryId } = req.params
    const { to_category_id } = req.body

    if (!to_category_id) {
      res.status(400).json({
        success: false,
        error: 'to_category_id es requerido',
      })
      return
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
  } catch (error) {
    const err = error as Error

    if (err.message.includes('no encontrada') || err.message.includes('misma cuenta')) {
      res.status(400).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en reassignTransactions:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
