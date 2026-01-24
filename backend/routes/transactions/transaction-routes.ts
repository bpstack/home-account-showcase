// routes/transactions/transaction-routes.ts

import { Router } from 'express'
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionsSummary,
  getStats,
  getBalanceHistory,
  getMonthlySummary,
  bulkUpdatePreview,
  bulkUpdateCategory,
} from '../../controllers/transactions/transaction-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

router.use(authenticateToken)

// GETs no necesitan CSRF
router.get('/', getTransactions)
router.get('/summary', getTransactionsSummary)
router.get('/stats', getStats)
router.get('/balance-history', getBalanceHistory)
router.get('/monthly-summary', getMonthlySummary)
router.get('/bulk-update-preview', bulkUpdatePreview)
router.get('/:id', getTransactionById)

// Mutaciones necesitan CSRF
router.post('/', checkCSRF, createTransaction)
router.put('/bulk-update-category', checkCSRF, bulkUpdateCategory)
router.put('/:id', checkCSRF, updateTransaction)
router.delete('/:id', checkCSRF, deleteTransaction)

export default router
