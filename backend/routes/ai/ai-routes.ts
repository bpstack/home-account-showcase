// routes/ai/ai-routes.ts

import { Router } from 'express'
import { getStatus } from '../../controllers/ai/ai-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router: Router = Router()

// Read-only: the provider comes from the server configuration, never from the API (ADR-014).
// Auth is required to report the user's own rate limit.
router.get('/status', authenticateToken, getStatus)

export default router
