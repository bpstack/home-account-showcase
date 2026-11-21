// middlewares/readRefreshSession.ts

import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'

/**
 * Before POST /auth/refresh: the refresh token must come from its httpOnly cookie and be a valid
 * refresh token of a stored session. Its session id is left in `res.locals.refreshSid` for the
 * per-session rate limiter, so the limiter never counts made-up keys.
 */
export async function readRefreshSession(req: Request, res: Response, next: NextFunction) {
  if (req.body?.refreshToken) {
    res.status(400).json({ success: false, error: 'Refresh token must come from httpOnly cookie' })
    return
  }
  const token = req.cookies?.refreshToken
  if (!token) {
    res.status(401).json({ success: false, error: 'Refresh token not provided' })
    return
  }
  try {
    const payload = await verifyToken(token, 'refresh')
    if (!payload.sid || !payload.jti) throw new Error('Token inválido')
    res.locals.refreshSid = payload.sid
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Sesión no válida' })
  }
}
