import { Router, type Router as RouterType } from 'express'
import multer from 'multer'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import {
  parseFile,
  confirmImport,
  getExistingCategories,
  getSavedMappings,
} from '../../controllers/import/import-controller.js'

const router: RouterType = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      // NOTA: application/octet-stream fue eliminado por seguridad
    ]
    const allowedExtensions = ['.xls', '.xlsx', '.csv']

    // Verificar ambos: tipo MIME y extensión del archivo
    const hasValidMimeType = allowedTypes.includes(file.mimetype)
    const hasValidExtension = allowedExtensions.some((e) => 
      file.originalname.toLowerCase().endsWith(e))
    
    // Siempre verificar que la extensión coincida con el tipo MIME
    if (!hasValidMimeType || !hasValidExtension) {
      cb(new Error('Solo se permiten archivos Excel (.xls, .xlsx) o CSV (.csv)'))
      return
    }

    cb(null, true)
  },
})

import { validateFileContent } from '../../services/import/file-validation.js'

// Parse uploaded file and return preview
router.post('/parse', authenticateToken, upload.single('file'), validateFileContent, parseFile)

// Confirm import with category mappings
router.post('/confirm', authenticateToken, checkCSRF, confirmImport)

// Get existing categories for mapping UI
router.get('/categories', authenticateToken, getExistingCategories)

// Get saved category mappings for auto-categorization
router.get('/mappings', authenticateToken, getSavedMappings)

export default router
