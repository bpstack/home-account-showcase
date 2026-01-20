// routes/accounts/account-routes.ts

import { Router } from 'express'
import {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getMembers,
  addMember,
  removeMember,
  leaveAccount,
  addDefaultCategories,
} from '../../controllers/accounts/account-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router = Router()

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
router.post('/:id/members', checkCSRF, addMember)
router.delete('/:id/members/:memberId', checkCSRF, removeMember)

// Leave account (abandonar cuenta)
router.post('/:id/leave', checkCSRF, leaveAccount)

// Categories
router.post('/:id/categories/default', checkCSRF, addDefaultCategories)

export default router
