// routes/ai/ai-routes.ts

import { Router } from 'express'
import { getStatus, setProvider, testConnection, parseTransactions } from '../../controllers/ai/ai-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Rutas públicas (para verificar estado)
router.get('/status', getStatus)

// Rutas protegidas
router.use(authenticateToken)
router.put('/provider', setProvider)
router.post('/test', testConnection)
router.post('/parse', parseTransactions)

export default router
