// routes/auth/auth-routes.ts

import { Router } from 'express'
import { register, login, me, logout, refresh } from '../../controllers/auth/auth-controller.js'
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
router.post('/logout', authenticateToken, checkCSRF, logout)

export default router
