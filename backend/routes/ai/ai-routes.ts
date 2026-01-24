// routes/ai/ai-routes.ts

import { Router } from 'express'
import { getStatus, setProvider, testConnection, parseTransactions, categorizeTransactions } from '../../controllers/ai/ai-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

router.get('/status', getStatus)

router.use(authenticateToken)
router.put('/provider', checkCSRF, setProvider)
router.post('/test', checkCSRF, testConnection)
router.post('/parse', checkCSRF, parseTransactions)
router.post('/categorize', checkCSRF, categorizeTransactions)

export default router
