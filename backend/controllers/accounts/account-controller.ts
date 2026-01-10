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
 * Crear nueva account
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

    const account = await AccountRepository.create({
      name,
      userId: req.user!.id,
    })

    res.status(201).json({
      success: true,
      account,
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
