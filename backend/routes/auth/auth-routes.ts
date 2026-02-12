// routes/auth/auth-routes.ts

import { Router } from 'express'
import {
  register,
  login,
  me,
  logout,
  refresh,
  getKeys,
  changePassword,
  changePin,
  saveVerificationBlob,
} from '../../controllers/auth/auth-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import { loginRateLimiter, registerRateLimiter } from '../../middlewares/rateLimiter.js'

const router: Router = Router()

// Rutas públicas
router.post('/register', registerRateLimiter, register) // Rate limiting en registro
router.post('/login', loginRateLimiter, login) // Rate limiting en login
router.post('/refresh', refresh)

// Rutas protegidas
router.get('/me', authenticateToken, me)
router.get('/keys', authenticateToken, getKeys)
router.post('/change-password', authenticateToken, checkCSRF, changePassword)
router.post('/change-pin', authenticateToken, checkCSRF, changePin)
router.post('/verification-blob', authenticateToken, checkCSRF, saveVerificationBlob)
router.post('/logout', authenticateToken, checkCSRF, logout)

export default router
