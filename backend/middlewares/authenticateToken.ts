// middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'

// Extender Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
      }
    }
  }
}

/**
 * Middleware para verificar el token JWT
 * Busca el token en el header Authorization: Bearer <token>
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null

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
