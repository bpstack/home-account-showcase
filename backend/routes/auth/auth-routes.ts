// routes/auth/auth-routes.ts

import { Router } from 'express'
import { register, login, me, logout } from '../../controllers/auth/auth-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Rutas públicas
router.post('/register', register)
router.post('/login', login)

// Rutas protegidas
router.get('/me', authenticateToken, me)
router.post('/logout', authenticateToken, logout)

export default router
