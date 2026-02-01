// routes/accounts/account-routes.ts

import { Router } from 'express'
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getMembers,
  removeMember,
  leaveAccount,
  addDefaultCategories,
} from '../../controllers/accounts/account-controller.js'
import { InvitationController } from '../../controllers/invitations/invitation-controller.js'
import { saveAccountKey } from '../../controllers/crypto/account-key-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD - GETs no necesitan CSRF
router.get('/', getAccounts)
router.get('/:id', getAccountById)

// Mutaciones necesitan CSRF
router.post('/', checkCSRF, createAccount)
router.put('/:id', checkCSRF, updateAccount)
router.delete('/:id', checkCSRF, deleteAccount)

// Members
router.get('/:id/members', getMembers)
// POST /:id/members eliminado - usar sistema de invitaciones
router.delete('/:id/members/:memberId', checkCSRF, removeMember)

// Leave account (abandonar cuenta)
router.post('/:id/leave', checkCSRF, leaveAccount)

// Categories
router.post('/:id/categories/default', checkCSRF, addDefaultCategories)

// Encryption keys
router.post('/:id/keys', checkCSRF, saveAccountKey)

// Invitations (NUEVO)
router.get('/:id/invitations', InvitationController.list)
router.post('/:id/invitations', checkCSRF, InvitationController.create)
router.delete('/:id/invitations/:invitationId', checkCSRF, InvitationController.revoke)

export default router
