// routes/ai/ai-routes.ts

import { Router } from 'express'
import { getStatus, setProvider, testConnection, parseTransactions, categorizeTransactions } from '../../controllers/ai/ai-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

router.get('/status', getStatus)

router.use(authenticateToken)
router.put('/provider', setProvider)
router.post('/test', testConnection)
router.post('/parse', parseTransactions)
router.post('/categorize', categorizeTransactions)

export default router
