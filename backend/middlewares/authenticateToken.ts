// middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'

declare module 'express' {
  interface Request {
    user?: {
      id: string
      email: string
    }
  }
}

/**
 * Middleware para verificar el token JWT
 * Backend agnóstico: extrae token de header Authorization O cookie
 * - Desarrollo local: header Authorization: Bearer <token>
 * - Producción: cookie accessToken (futuro)
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
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

    const decoded = verifyToken(token)

    if (!decoded?.id) {
      res.status(401).json({
        success: false,
        error: 'Token inválido',
      })
      return
    }

    // Agregar usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
    }

    next()
  } catch (error) {
    const err = error as Error
    let message = 'Token inválido'

    if (err.message === 'Token expirado') {
      message = 'Token expirado'
    }

    res.status(401).json({
      success: false,
      error: message,
    })
  }
}
