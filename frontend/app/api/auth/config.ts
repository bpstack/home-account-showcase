// Configuración compartida para rutas de auth proxy

import type { NextResponse } from 'next/server'
import {
  SESSION_COOKIES,
  parseSessionCookies,
  type SessionCookieName,
  type SessionCookies,
} from '@/lib/sessionCookies'

export { backendCookieHeader } from '@/lib/sessionCookies'

export const BACKEND_URL = process.env.API_URL || 'http://localhost:3001/api'

export { isAllowedOrigin } from '@/lib/auth-origins'

// Opciones de cookies para producción/desarrollo
const isProduction = process.env.NODE_ENV === 'production'

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60, // 15 minutos en segundos
}

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 horas en segundos
}

export const csrfTokenCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 8 * 60 * 60, // 8 horas en segundos
}

const sessionCookieOptions: Record<SessionCookieName, typeof accessTokenCookieOptions> = {
  accessToken: accessTokenCookieOptions,
  refreshToken: refreshTokenCookieOptions,
  csrfToken: csrfTokenCookieOptions,
}

/** The session cookies a backend response sets or clears. */
export function sessionFromBackend(res: Response): SessionCookies {
  return parseSessionCookies(res.headers.getSetCookie())
}

/** Copies a backend session onto the browser's response: sets what it set, deletes what it cleared. */
export function applySession(response: NextResponse, session: SessionCookies): void {
  for (const name of SESSION_COOKIES) {
    const value = session[name]
    if (value === null) response.cookies.delete(name)
    else if (value) response.cookies.set(name, value, sessionCookieOptions[name])
  }
}

/**
 * Asks the backend for a new session with the refresh token. The only refresh path: the proxy,
 * `me` and `refresh` all use it, so a rotated refresh token always reaches the browser. Returns
 * `null` if the backend refuses or hands over no access token.
 */
export async function refreshSession(refreshToken: string): Promise<SessionCookies | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `refreshToken=${refreshToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const session = sessionFromBackend(res)
    return session.accessToken ? session : null
  } catch {
    return null
  }
}

// Cookie para cuenta seleccionada (no httpOnly para que JS pueda leerla)
export const selectedAccountCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 días
}
