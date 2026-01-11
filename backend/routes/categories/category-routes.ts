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

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD
router.get('/', getCategories)
router.get('/:id', getCategoryById)
router.get('/:id/orphaned-count', getOrphanedCount)
router.post('/', createCategory)
router.post('/:id/reassign', reassignTransactions)
router.put('/:id', updateCategory)
router.delete('/:id', deleteCategory)

export default router
