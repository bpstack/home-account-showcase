// controllers/auth/auth-controller.ts

import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../services/auth/tokenService.js'
import { generateCSRFToken, createCSRFCookieOptions } from '../../services/auth/csrfService.js'
import type { RegisterDTO, LoginDTO } from '../../models/auth/index.js'
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  type RegisterInput,
  type LoginInput,
  type RefreshInput,
} from '../../validators/auth-validators.js'

const isProduction = process.env.NODE_ENV === 'production'

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 5 * 60 * 1000, // 5 minutos
  path: '/',
}

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 8 * 60 * 60 * 1000, // 8 horas
  path: '/',
}

const csrfCookieOptions = createCSRFCookieOptions()

/**
 * Registro de nuevo usuario
 * POST /api/auth/register
 *
 * Body includes encryptedAccountKey for envelope encryption
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = registerSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Datos inválidos',
      })
      return
    }

    const { email, password, name, accountName, skipDefaultAccount, encryptedAccountKey } =
      validationResult.data as RegisterInput

    const result = await UserRepository.create({
      email,
      password,
      name,
      accountName,
      skipDefaultAccount,
      encryptedAccountKey,
    })

    const accessToken = generateAccessToken({ id: result.id, email: result.email })
    const refreshToken = generateRefreshToken({ id: result.id, email: result.email })
    const csrfToken = generateCSRFToken()

    // Establecer cookies httpOnly
    res.cookie('accessToken', accessToken, accessTokenCookieOptions)
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
    res.cookie('csrfToken', csrfToken, csrfCookieOptions)

    // User object without key_salt (will be derived client-side)
    const user = {
      id: result.id,
      email: result.email,
      name: result.name,
      created_at: result.created_at,
    }

    // Response includes key_salt for client to derive User Key
    res.status(201).json({
      success: true,
      user,
      key_salt: result.key_salt,
      accountId: result.accountId,
      csrfToken,
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
 *
 * Returns key_salt and encrypted_keys for envelope encryption
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = loginSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Datos inválidos',
      })
      return
    }

    const { email, password } = validationResult.data as LoginInput

    const userWithSalt = await UserRepository.login({ email, password })

    // Get encrypted account keys for this user
    const encryptedKeys = await AccountKeyRepository.getByUserId(userWithSalt.id)

    const accessToken = generateAccessToken({ id: userWithSalt.id, email: userWithSalt.email })
    const refreshToken = generateRefreshToken({ id: userWithSalt.id, email: userWithSalt.email })
    const csrfToken = generateCSRFToken()

    // Establecer cookies httpOnly
    res.cookie('accessToken', accessToken, accessTokenCookieOptions)
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
    res.cookie('csrfToken', csrfToken, csrfCookieOptions)

    // User object without key_salt in the user object
    const user = {
      id: userWithSalt.id,
      email: userWithSalt.email,
      name: userWithSalt.name,
      created_at: userWithSalt.created_at,
      updated_at: userWithSalt.updated_at,
    }

    // Response includes key_salt and encrypted_keys for client-side decryption
    res.status(200).json({
      success: true,
      user,
      key_salt: userWithSalt.key_salt,
      encrypted_keys: encryptedKeys,
      csrfToken,
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
 * Refresh access token usando refresh token
 * POST /api/auth/refresh
 * SIEMPRE usa refresh token desde cookies httpOnly por seguridad
 * No acepta refresh token desde body para prevenir ataques XSS
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Seguridad: Solo aceptar refresh token desde cookies httpOnly
    const refreshTokenFromCookie = req.cookies?.refreshToken
    const refreshTokenFromBody = req.body?.refreshToken

    // Rechazar explícitamente si viene por body
    if (refreshTokenFromBody) {
      res.status(400).json({
        success: false,
        error: 'Método no permitido. El refresh token debe venir en cookies httpOnly.',
      })
      return
    }

    const refreshToken = refreshTokenFromCookie

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        error: 'Refresh token no proporcionado',
      })
      return
    }

    // Verificar el refresh token
    const decoded = verifyToken(refreshToken)

    // Verificar que el usuario existe
    const user = await UserRepository.getById(decoded.id)
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuario no encontrado',
      })
      return
    }

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({ id: user.id, email: user.email })
    const newCSRFToken = generateCSRFToken()

    // Establecer nueva cookie httpOnly
    res.cookie('accessToken', newAccessToken, accessTokenCookieOptions)
    res.cookie('csrfToken', newCSRFToken, csrfCookieOptions)

    res.status(200).json({
      success: true,
      csrfToken: newCSRFToken,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'Token expirado' || err.message === 'Token inválido') {
      res.status(401).json({
        success: false,
        error: 'Refresh token inválido o expirado',
      })
      return
    }

    console.error('Error en refresh:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Get encryption keys for authenticated user
 * GET /api/auth/keys
 *
 * Used after page refresh to re-derive User Key and unlock accounts
 * Returns key_salt and encrypted_keys for the current user
 */
export const getKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get user with key_salt
    const user = await UserRepository.getByIdWithKeySalt(req.user!.id)
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
      })
      return
    }

    // Get encrypted account keys
    const encryptedKeys = await AccountKeyRepository.getByUserId(req.user!.id)

    res.status(200).json({
      success: true,
      key_salt: user.key_salt,
      encrypted_keys: encryptedKeys,
    })
  } catch (error) {
    console.error('Error en getKeys:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Logout (invalida el refresh token)
 * POST /api/auth/logout
 *
 * Nota: Los JWT son stateless, no se pueden invalidar directamente.
 * Para invalidación inmediata, se usaría una blacklist en BD/Redis.
 * Por ahora, el frontend simplemente borra los tokens.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Limpiar cookies httpOnly
    res.clearCookie('accessToken', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })
    res.clearCookie('csrfToken', { path: '/' })

    // Opcional: Invalidar refresh token en BD si implementamos blacklist
    // Por ahora las cookies se borran y eso es suficiente
    // Para invalidación inmediata, se usaría una blacklist en Redis

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente',
    })
  } catch (error) {
    console.error('Error en logout:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
