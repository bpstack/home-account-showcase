// routes/auth/user-routes.ts

import { Router } from 'express'
import { updateCurrentUser } from '../../controllers/auth/user-controllers.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

// Only the signed-in user, identified by the session, never by the URL
router.put('/me', authenticateToken, checkCSRF, updateCurrentUser)

export default router
