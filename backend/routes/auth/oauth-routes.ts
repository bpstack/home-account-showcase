import { Router, Request, Response, NextFunction } from 'express'
import passport from 'passport'
import { oauthCallback } from '../../controllers/auth/oauth-controller.js'

const router: Router = Router()

// Wrapper para evitar conflictos de tipos entre passport y express
const passportCallback = (req: Request, res: Response, next: NextFunction) => {
  oauthCallback(req, res, next)
}

router.get(
  '/google',
  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
  })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login?error=oauth_failed',
  }),
  passportCallback
)

router.get(
  '/github',
  passport.authenticate('github', {
    session: false,
    scope: ['user:email'],
  })
)

router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: '/login?error=oauth_failed',
  }),
  passportCallback
)

export default router
