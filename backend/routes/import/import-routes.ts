import { Router, type Router as RouterType } from 'express'
import multer from 'multer'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
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
      'application/octet-stream',
      'text/csv',
      'text/plain',
    ]
    const allowedExtensions = ['.xls', '.xlsx', '.csv']

    if (
      allowedTypes.includes(file.mimetype) ||
      allowedExtensions.some((e) => file.originalname.toLowerCase().endsWith(e))
    ) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xls, .xlsx) o CSV (.csv)'))
    }
  },
})

// Parse uploaded file and return preview
router.post('/parse', authenticateToken, upload.single('file'), parseFile)

// Confirm import with category mappings
router.post('/confirm', authenticateToken, confirmImport)

// Get existing categories for mapping UI
router.get('/categories', authenticateToken, getExistingCategories)

// Get saved category mappings for auto-categorization
router.get('/mappings', authenticateToken, getSavedMappings)

export default router
