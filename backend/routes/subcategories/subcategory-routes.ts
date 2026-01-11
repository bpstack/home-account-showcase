// routes/subcategories/subcategory-routes.ts

import { Router } from 'express'
import {
  getSubcategories,
  getSubcategoryById,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from '../../controllers/subcategories/subcategory-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD
router.get('/', getSubcategories)
router.get('/:id', getSubcategoryById)
router.post('/', createSubcategory)
router.put('/:id', updateSubcategory)
router.delete('/:id', deleteSubcategory)

export default router
