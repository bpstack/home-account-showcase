import { Request, Response, NextFunction } from 'express'
import { secureXSS } from '../utils/secure-sanitize.js'
import { PASSWORD_FIELDS } from '../utils/password-compare.js'

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      // A password is hashed, never shown: it is checked exactly as typed
      if (typeof req.body[key] === 'string' && !PASSWORD_FIELDS.has(key)) {
        req.body[key] = secureXSS(req.body[key])
      }
    }
  }
  next()
}
