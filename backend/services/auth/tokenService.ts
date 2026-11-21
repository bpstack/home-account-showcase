// services/auth/tokenService.ts

import { SignJWT, jwtVerify, errors } from 'jose'
import { SECRET_JWT_KEY } from '../../config/config.js'
import type { TokenPayload } from '../../models/auth/index.js'

// Encode secret key for jose
const secret = new TextEncoder().encode(SECRET_JWT_KEY)

/**
 * Each token says what it is in its protected `typ` header, and each check demands that type: an
 * access token cannot refresh, a refresh token cannot act as an access token, and a token without
 * a type (the format before sessions were stored) is refused.
 */
export type TokenType = 'access' | 'refresh' | 'oauth-code'

const ACCESS_TOKEN_EXPIRY = '15m'
/** A session lasts 8 h from sign-in; rotating its refresh token does not extend it. */
export const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000
/** A one-time OAuth code must be exchanged within this time. */
export const OAUTH_CODE_LIFETIME_S = 60

type TokenUser = { id: string; email: string }

function sign(payload: Record<string, unknown>, typ: TokenType) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ }).setIssuedAt()
}

/** Short-lived token for API requests, tied to its session. */
export async function generateAccessToken(user: TokenUser, sid: string): Promise<string> {
  if (!user?.id) throw new Error('Usuario inválido para generar token')
  return sign({ id: user.id, email: user.email, sid }, 'access')
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret)
}

/** The session's only live refresh credential; it expires when the session does. */
export async function generateRefreshToken(
  user: TokenUser,
  sid: string,
  jti: string,
  sessionExpiresAt: Date
): Promise<string> {
  if (!user?.id) throw new Error('Usuario inválido para generar refresh token')
  return sign({ id: user.id, email: user.email, sid }, 'refresh')
    .setJti(jti)
    .setExpirationTime(Math.floor(sessionExpiresAt.getTime() / 1000))
    .sign(secret)
}

/** One-time code an OAuth sign-in hands to the browser, exchanged for the session cookies. */
export async function generateOAuthCode(user: TokenUser, sid: string, jti: string) {
  return sign({ id: user.id, email: user.email, sid }, 'oauth-code')
    .setJti(jti)
    .setExpirationTime(`${OAUTH_CODE_LIFETIME_S}s`)
    .sign(secret)
}

/** Verifies a token of the given type. Throws 'Token expirado' or 'Token inválido'. */
export async function verifyToken(token: string, typ: TokenType): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret, { typ, algorithms: ['HS256'] })
    return payload as unknown as TokenPayload
  } catch (error) {
    if (error instanceof errors.JWTExpired) throw new Error('Token expirado')
    throw new Error('Token inválido')
  }
}

/**
 * Like verifyToken, but an expired token is still accepted: logout must end the session of an
 * expired refresh token too. The signature and the type are always checked first (jose validates
 * the claims, and so the expiry, only after the signature).
 */
export async function verifyTokenAllowingExpiry(
  token: string,
  typ: TokenType
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { typ, algorithms: ['HS256'] })
    return payload as unknown as TokenPayload
  } catch (error) {
    if (error instanceof errors.JWTExpired) return error.payload as unknown as TokenPayload
    return null
  }
}
