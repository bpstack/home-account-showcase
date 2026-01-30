// routes/ai/ai-routes.ts

import { Router } from 'express'
import {
  getStatus,
  setProvider,
  testConnection,
  parseTransactions,
  categorizeTransactions,
} from '../../controllers/ai/ai-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import { aiRateLimiter } from '../../middlewares/aiRateLimiter.js'

const router: Router = Router()

// Status requires auth to get correct rate limit info for the user
router.get('/status', authenticateToken, getStatus)

router.use(authenticateToken)
router.put('/provider', checkCSRF, setProvider)

// Test connection: NO rate limit (free)
router.post('/test', checkCSRF, aiRateLimiter({ skipRateLimit: true }), testConnection)

// Parse: counts as 1 request, marks for categorize combo
router.post('/parse', checkCSRF, aiRateLimiter({ isParse: true }), parseTransactions)

// Categorize: free if done right after parse, otherwise counts
router.post('/categorize', checkCSRF, aiRateLimiter({ isCategorize: true }), categorizeTransactions)

export default router
