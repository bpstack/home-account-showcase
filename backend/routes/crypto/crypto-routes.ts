// routes/crypto/crypto-routes.ts

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import { updateAllKeys } from '../../controllers/crypto/account-key-controller.js'

const router: Router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

/**
 * PUT /api/auth/keys
 * Actualizar todas las keys (cambio de password)
 */
router.put('/keys', checkCSRF, updateAllKeys)

export default router
