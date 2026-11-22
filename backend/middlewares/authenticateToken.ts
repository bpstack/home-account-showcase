// middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'
import { SessionRepository } from '../repositories/auth/session-repository.js'

declare module 'express' {
  interface Request {
    user?: {
      id: string
      email: string
      /** The stored session of this request's access token. */
      sid?: string
    }
  }
}

/**
 * Middleware para verificar el token JWT
 * Backend agnóstico: extrae token de header Authorization O cookie
 * - Desarrollo local: header Authorization: Bearer <token>
 * - Producción: cookie accessToken (futuro)
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Intentar obtener token del header Authorization (desarrollo local)
  const authHeader = req.headers['authorization']
  const tokenFromHeader =
    authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null

  // Intentar obtener token de cookie (producción futura)
  const tokenFromCookie = req.cookies?.accessToken

  const token = tokenFromHeader || tokenFromCookie

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token no proporcionado',
    })
    return
  }

  // Only an access token: a refresh token or an OAuth code is refused here
  let decoded: Awaited<ReturnType<typeof verifyToken>>
  try {
    decoded = await verifyToken(token, 'access')
  } catch (error) {
    const message =
      (error as Error).message === 'Token expirado' ? 'Token expirado' : 'Token inválido'
    res.status(401).json({ success: false, error: message })
    return
  }

  // Every access token belongs to a stored session; one without could revoke all of them
  if (!decoded?.id || !decoded.sid) {
    res.status(401).json({ success: false, error: 'Token inválido' })
    return
  }

  // The session must still be live: after a logout or a password change its access tokens stop
  // working now, not when they expire. A database failure is not an answer: it goes on as a 500,
  // so that it does not sign anyone out.
  let live: boolean
  try {
    live = await SessionRepository.isLive(decoded.sid, decoded.id)
  } catch (error) {
    next(error)
    return
  }
  if (!live) {
    res.status(401).json({ success: false, error: 'Sesión terminada' })
    return
  }

  req.user = {
    id: decoded.id,
    email: decoded.email,
    sid: decoded.sid,
  }

  next()
}
