// routes/auth/auth-routes.ts

import { Router } from 'express'
import { register, login, me, logout, refresh } from '../../controllers/auth/auth-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { loginRateLimiter } from '../../middlewares/rateLimiter.js'

const router = Router()

// Rutas públicas
router.post('/register', register)
router.post('/login', loginRateLimiter, login) // Rate limiting solo en login
router.post('/refresh', refresh)

// Rutas protegidas
router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

export default router
