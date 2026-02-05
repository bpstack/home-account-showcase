// routes/transactions/transaction-routes.ts

import { Router } from 'express'
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  bulkUpdateByIds,
} from '../../controllers/transactions/transaction-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'

const router: Router = Router()

router.use(authenticateToken)

// GETs - CRUD básico (los stats/summary se calculan client-side con E2E)
router.get('/', getTransactions)
router.get('/:id', getTransactionById)

// Mutaciones
router.post('/', checkCSRF, createTransaction)
router.put('/bulk-update-by-ids', checkCSRF, bulkUpdateByIds)
router.put('/:id', checkCSRF, updateTransaction)
router.delete('/:id', checkCSRF, deleteTransaction)

export default router
