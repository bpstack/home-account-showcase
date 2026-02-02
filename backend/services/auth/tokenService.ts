// services/auth/tokenService.ts

import { SignJWT, jwtVerify, errors } from 'jose'
import { SECRET_JWT_KEY } from '../../config/config.js'
import type { TokenPayload } from '../../models/auth/index.js'

// Encode secret key for jose
const secret = new TextEncoder().encode(SECRET_JWT_KEY)

// Sistema de tokens dual
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutos (aumentado para mejor UX)
const REFRESH_TOKEN_EXPIRY = '8h' // 8 horas (consistente con cookie)

/**
 * Genera un access token JWT (corta duración - 5 minutos)
 */
export async function generateAccessToken(user: { id: string; email: string }): Promise<string> {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar token')
  }

  return new SignJWT({ id: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret)
}

/**
 * Genera un refresh token JWT (larga duración - 1 hora)
 */
export async function generateRefreshToken(user: { id: string; email: string }): Promise<string> {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar refresh token')
  }

  return new SignJWT({ id: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret)
}

/**
 * Verifica y decodifica un token JWT (access o refresh)
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as TokenPayload
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new Error('Token expirado')
    }
    if (
      error instanceof errors.JWTInvalid ||
      error instanceof errors.JWSSignatureVerificationFailed
    ) {
      throw new Error('Token inválido')
    }
    throw new Error('Error al verificar token')
  }
}

/**
 * @deprecated Usar generateAccessToken en su lugar
 * Mantenido para compatibilidad temporal
 */
export async function generateToken(user: { id: string; email: string }): Promise<string> {
  return generateAccessToken(user)
}
