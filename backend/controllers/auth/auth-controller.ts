// controllers/auth/auth-controller.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { generateToken } from '../../services/auth/tokenService.js'
import type { RegisterDTO, LoginDTO } from '../../models/auth/index.js'

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body as RegisterDTO

    // Validación básica
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password y nombre son requeridos',
      })
      return
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres',
      })
      return
    }

    const user = await UserRepository.create({ email, password, name })
    const token = generateToken({ id: user.id, email: user.email })

    res.status(201).json({
      success: true,
      user,
      token,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'El email ya está registrado') {
      res.status(409).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en register:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Login de usuario
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginDTO

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email y password son requeridos',
      })
      return
    }

    const user = await UserRepository.login({ email, password })
    const token = generateToken({ id: user.id, email: user.email })

    res.status(200).json({
      success: true,
      user,
      token,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Credenciales inválidas') {
      res.status(401).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en login:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtener usuario autenticado
 * GET /api/auth/me
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserRepository.getById(req.user!.id)

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      })
      return
    }

    res.status(200).json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Error en /me:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Logout (solo respuesta de éxito, el frontend borra el token)
 * POST /api/auth/logout
 */
export const logout = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'Sesión cerrada correctamente',
  })
}
