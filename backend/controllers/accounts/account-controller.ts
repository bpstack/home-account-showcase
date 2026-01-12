// controllers/accounts/account-controller.ts

import { Request, Response } from 'express'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'

/**
 * Obtener accounts del usuario autenticado
 * GET /api/accounts
 */
export const getAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const accounts = await AccountRepository.getByUserId(req.user!.id)

    res.status(200).json({
      success: true,
      accounts,
    })
  } catch (error) {
    console.error('Error en getAccounts:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener account por ID
 * GET /api/accounts/:id
 */
export const getAccountById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const account = await AccountRepository.getById(id, req.user!.id)

    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      account,
    })
  } catch (error) {
    console.error('Error en getAccountById:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Crear nueva account con categorías por defecto
 * POST /api/accounts
 */
export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido',
      })
      return
    }

    const result = await AccountRepository.createWithDefaults({
      name,
      userId: req.user!.id,
    })

    res.status(201).json({
      success: true,
      account: result.account,
      categoriesCopied: result.categoriesCopied,
    })
  } catch (error) {
    console.error('Error en createAccount:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Agregar categorías por defecto a una cuenta existente
 * POST /api/accounts/:id/categories/default
 */
export const addDefaultCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Verificar que es owner
    const role = await AccountRepository.getUserRole(id, req.user!.id)

    if (role !== 'owner') {
      res.status(403).json({
        success: false,
        error: 'Solo el owner puede agregar categorías por defecto',
      })
      return
    }

    const result = await AccountRepository.copyDefaultCategories(id)

    res.status(201).json({
      success: true,
      message: `Categorías agregadas: ${result.categories} categorías, ${result.subcategories} subcategorías`,
      ...result,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Solo el owner puede agregar categorías por defecto') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en addDefaultCategories:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Actualizar account
 * PUT /api/accounts/:id
 */
export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'El nombre es requerido',
      })
      return
    }

    const account = await AccountRepository.update(id, req.user!.id, { name })

    if (!account) {
      res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      account,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Solo el owner puede modificar la cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en updateAccount:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Eliminar account
 * DELETE /api/accounts/:id
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const deleted = await AccountRepository.delete(id, req.user!.id)

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Cuenta no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Cuenta eliminada correctamente',
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Solo el owner puede eliminar la cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en deleteAccount:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener miembros del account
 * GET /api/accounts/:id/members
 */
export const getMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const members = await AccountRepository.getMembers(id, req.user!.id)

    res.status(200).json({
      success: true,
      members,
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

    console.error('Error en getMembers:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Agregar miembro al account por email Y nombre
 * POST /api/accounts/:id/members
 */
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { email, name } = req.body

    if (!email || !name) {
      res.status(400).json({
        success: false,
        error: 'Email y nombre son requeridos',
      })
      return
    }

    await AccountRepository.addMember(id, req.user!.id, email, name)

    res.status(201).json({
      success: true,
      message: 'Miembro agregado correctamente',
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Solo el owner puede agregar miembros') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'Usuario no encontrado: el email y nombre no coinciden') {
      res.status(404).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'El usuario ya es miembro de esta cuenta') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en addMember:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Remover miembro de account (solo owner puede remover a otros)
 * DELETE /api/accounts/:id/members/:memberId
 */
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, memberId } = req.params

    await AccountRepository.removeMember(id, req.user!.id, memberId)

    res.status(200).json({
      success: true,
      message: 'Miembro removido correctamente',
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Solo el owner puede remover miembros') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    if (err.message === 'El owner no puede removerse a sí mismo') {
      res.status(400).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en removeMember:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Abandonar cuenta (usuario se remueve a sí mismo)
 * POST /api/accounts/:id/leave
 */
export const leaveAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    await AccountRepository.leaveAccount(id, userId)

    res.status(200).json({
      success: true,
      message: 'Has abandonado la cuenta correctamente',
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

    if (err.message === 'El owner no puede abandonar la cuenta. Transfiere la propiedad primero.') {
      res.status(400).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en leaveAccount:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
