// services/auth/tokenService.ts

import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../../config/config.js'
import type { TokenPayload } from '../../models/auth/index.js'

// Fase 3: Sistema de tokens dual
const ACCESS_TOKEN_EXPIRY = '5m' // 5 minutos
const REFRESH_TOKEN_EXPIRY = '8h' // 8 horas

/**
 * Genera un access token JWT (corta duración - 5 minutos)
 */
export function generateAccessToken(user: { id: string; email: string }): string {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar token')
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Genera un refresh token JWT (larga duración - 8 horas)
 */
export function generateRefreshToken(user: { id: string; email: string }): string {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar refresh token')
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

/**
 * Verifica y decodifica un token JWT (access o refresh)
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, SECRET_JWT_KEY) as TokenPayload
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado')
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido')
      }
    }
    throw new Error('Error al verificar token')
  }
}

/**
 * @deprecated Usar generateAccessToken en su lugar
 * Mantenido para compatibilidad temporal
 */
export function generateToken(user: { id: string; email: string }): string {
  return generateAccessToken(user)
}
