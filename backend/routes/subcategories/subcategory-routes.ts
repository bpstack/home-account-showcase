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
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router = Router()

// Todas las rutas requieren autenticación
router.use(authenticateToken)

// CRUD - GETs no necesitan CSRF
router.get('/', getSubcategories)
router.get('/:id', getSubcategoryById)

// Mutaciones necesitan CSRF
router.post('/', checkCSRF, createSubcategory)
router.put('/:id', checkCSRF, updateSubcategory)
router.delete('/:id', checkCSRF, deleteSubcategory)

export default router
