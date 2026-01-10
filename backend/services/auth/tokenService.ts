// services/auth/tokenService.ts

import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../../config/config.js'
import type { TokenPayload } from '../../models/auth/index.js'

// Token expira en 7 días (Fase 1 - localStorage)
const TOKEN_EXPIRY = '7d'

/**
 * Genera un token JWT
 */
export function generateToken(user: { id: string; email: string }): string {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar token')
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    email: user.email,
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: TOKEN_EXPIRY })
}

/**
 * Verifica y decodifica un token JWT
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
