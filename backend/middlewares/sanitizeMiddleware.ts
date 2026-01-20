import { Request, Response, NextFunction } from 'express'
import { sanitizeXSS } from '../utils/sanitize.js'

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeXSS(req.body[key])
      }
    }
  }
  next()
}

export function sanitizeQuery(req: Request, _res: Response, next: NextFunction): void {
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      const value = req.query[key]
      if (typeof value === 'string') {
        req.query[key] = sanitizeXSS(value) as any
      }
    }
  }
  next()
}

export function sanitizeParams(req: Request, _res: Response, next: NextFunction): void {
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      const value = req.params[key]
      if (typeof value === 'string') {
        req.params[key] = sanitizeXSS(value)
      }
    }
  }
  next()
}
