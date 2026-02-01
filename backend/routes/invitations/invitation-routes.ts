// routes/invitations/invitation-routes.ts

import { Router } from 'express'
import { InvitationController } from '../../controllers/invitations/invitation-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router: Router = Router()

// ============================================
// RUTAS PÚBLICAS (sin auth)
// ============================================

// GET /invitations/:token - Ver info de invitación
router.get('/:token', InvitationController.getByToken)

// ============================================
// RUTAS PROTEGIDAS (requieren auth)
// ============================================

// POST /invitations/:token/accept - Aceptar invitación
router.post('/:token/accept', authenticateToken, InvitationController.accept)

export default router
