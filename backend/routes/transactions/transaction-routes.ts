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
} from '../../controllers/transactions/transaction-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getTransactions)
router.get('/summary', getTransactionsSummary)
router.get('/stats', getStats)
router.get('/balance-history', getBalanceHistory)
router.get('/monthly-summary', getMonthlySummary)
router.get('/:id', getTransactionById)
router.post('/', createTransaction)
router.put('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

export default router
