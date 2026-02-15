import { Response, NextFunction } from 'express'
import { validateCSRFToken } from '../services/auth/csrfService.js'

export function checkCSRF(req: any, res: Response, next: NextFunction): void {
  const csrfHeader = req.headers['x-csrf-token']
  const csrfCookie = req.cookies?.csrfToken

  if (!validateCSRFToken(csrfHeader, csrfCookie)) {
    res.status(403).json({
      success: false,
      error: 'CSRF token inválido o faltante',
    })
    return
  }

  next()
}
