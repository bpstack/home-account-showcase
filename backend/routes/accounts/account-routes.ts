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

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD
router.get('/', getAccounts)
router.get('/:id', getAccountById)
router.post('/', createAccount)
router.put('/:id', updateAccount)
router.delete('/:id', deleteAccount)

// Members
router.get('/:id/members', getMembers)
router.post('/:id/members', addMember)
router.delete('/:id/members/:memberId', removeMember)

// Leave account (abandonar cuenta)
router.post('/:id/leave', leaveAccount)

// Categories
router.post('/:id/categories/default', addDefaultCategories)

export default router
