// routes/categories/category-routes.ts

import { Router } from 'express'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getOrphanedCount,
  reassignTransactions,
} from '../../controllers/categories/category-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD - GETs no necesitan CSRF
router.get('/', getCategories)
router.get('/:id', getCategoryById)
router.get('/:id/orphaned-count', getOrphanedCount)

// Mutaciones necesitan CSRF
router.post('/', checkCSRF, createCategory)
router.post('/:id/reassign', checkCSRF, reassignTransactions)
router.put('/:id', checkCSRF, updateCategory)
router.delete('/:id', checkCSRF, deleteCategory)

export default router
