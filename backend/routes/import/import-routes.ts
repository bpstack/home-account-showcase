import { Router, type Router as RouterType } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import {
  confirmImport,
  getExistingCategories,
  getSavedMappings,
  getImportHashes,
} from '../../controllers/import/import-controller.js'

const router: RouterType = Router()

// Confirm import with category mappings
router.post('/confirm', authenticateToken, checkCSRF, confirmImport)

// Get existing categories for mapping UI
router.get('/categories', authenticateToken, getExistingCategories)

// Get saved category mappings for auto-categorization
router.get('/mappings', authenticateToken, getSavedMappings)

// Import hashes already stored, to mark duplicates before confirming
router.get('/hashes', authenticateToken, getImportHashes)

export default router
