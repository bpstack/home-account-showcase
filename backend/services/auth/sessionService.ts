// services/auth/sessionService.ts

import { createHash, randomBytes } from 'crypto'
import type { Response } from 'express'
import { SessionRepository } from '../../repositories/auth/session-repository.js'
import { logger } from '../../utils/logger.js'
import { createCSRFCookieOptions, generateCSRFToken } from './csrfService.js'
import {
  SESSION_LIFETIME_MS,
  generateAccessToken,
  generateOAuthCode,
  generateRefreshToken,
  verifyToken,
  type TokenType,
} from './tokenService.js'

const isProduction = process.env.NODE_ENV === 'production'
const sameSite = isProduction ? ('none' as const) : ('lax' as const)

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite,
  maxAge: 15 * 60 * 1000,
  path: '/',
}

/** Seconds within which a replaced refresh token still gets an access token (parallel requests). */
export const REFRESH_GRACE_SECONDS = 60

type SessionUser = { id: string; email: string }

/** Only the hash of a credential's jti is stored: a copy of the table yields no usable token. */
export function hashJti(jti: string): Buffer {
  return createHash('sha256').update(jti).digest()
}

function newJti(): string {
  return randomBytes(16).toString('hex')
}

function setCookies(
  res: Response,
  tokens: { accessToken: string; csrfToken: string; refreshToken?: string; expiresAt: Date }
) {
  res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions)
  res.cookie('csrfToken', tokens.csrfToken, createCSRFCookieOptions())
  if (tokens.refreshToken) {
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      maxAge: Math.max(0, tokens.expiresAt.getTime() - Date.now()),
      path: '/',
    })
  }
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })
}

/** Signs a user in: stores a new session and sets its three cookies. Returns the CSRF token. */
export async function startSession(res: Response, user: SessionUser): Promise<string> {
  const jti = newJti()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
  const sid = await SessionRepository.create(user.id, hashJti(jti), expiresAt)
  const csrfToken = generateCSRFToken()
  setCookies(res, {
    accessToken: await generateAccessToken(user, sid),
    refreshToken: await generateRefreshToken(user, sid, jti, expiresAt),
    csrfToken,
    expiresAt,
  })
  return csrfToken
}

/**
 * OAuth sign-in: stores a new session whose first live credential is a one-time code, and returns
 * the code. Exchanging it (continueSession with 'oauth-code') sets the cookies.
 */
export async function startOAuthSession(user: SessionUser): Promise<string> {
  const jti = newJti()
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
  const sid = await SessionRepository.create(user.id, hashJti(jti), expiresAt)
  return generateOAuthCode(user, sid, jti)
}

export type ContinueResult =
  | { ok: true; userId: string; sid: string; csrfToken: string }
  | { ok: false }

/**
 * Exchanges the session's live credential (a refresh token, or a one-time OAuth code) for a new
 * access token and, unless it was a parallel request within the grace window, a new refresh
 * token. A replaced credential presented again ends the session. No grace for an OAuth code.
 */
export async function continueSession(
  res: Response,
  credential: string,
  typ: Extract<TokenType, 'refresh' | 'oauth-code'>
): Promise<ContinueResult> {
  let payload
  try {
    payload = await verifyToken(credential, typ)
  } catch {
    return { ok: false }
  }
  if (!payload.sid || !payload.jti) return { ok: false }

  const jti = newJti()
  const grace = typ === 'refresh' ? REFRESH_GRACE_SECONDS : 0
  const outcome = await SessionRepository.rotate(
    payload.sid,
    hashJti(payload.jti),
    hashJti(jti),
    grace
  )

  if (outcome.status === 'reuse') {
    logger.warn('AUTH', 'continueSession', 'Replaced credential reused: session revoked', {
      userId: outcome.userId,
      typ,
    })
    return { ok: false }
  }
  if (outcome.status === 'invalid') return { ok: false }

  const user = { id: outcome.userId, email: payload.email }
  const csrfToken = generateCSRFToken()
  setCookies(res, {
    accessToken: await generateAccessToken(user, payload.sid),
    refreshToken:
      outcome.status === 'rotated'
        ? await generateRefreshToken(user, payload.sid, jti, outcome.expiresAt)
        : undefined,
    csrfToken,
    expiresAt: outcome.expiresAt,
  })
  return { ok: true, userId: outcome.userId, sid: payload.sid, csrfToken }
}
