// routes/budget/budget-routes.ts

import { Router } from 'express'
import {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../../controllers/budget/budget-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

// All routes require authentication
router.use(authenticateToken)

// GET /budget - Get all budgets for active account
router.get('/', getBudgets)

// GET /budget/:id - Get single budget
router.get('/:id', getBudget)

// POST /budget - Create budget
router.post('/', checkCSRF, createBudget)

// PATCH /budget/:id - Update budget
router.patch('/:id', checkCSRF, updateBudget)

// DELETE /budget/:id - Delete budget
router.delete('/:id', checkCSRF, deleteBudget)

export default router
