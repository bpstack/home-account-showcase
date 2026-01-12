// controllers/transactions/transaction-controller.ts

import { Request, Response } from 'express'
import { TransactionRepository } from '../../repositories/transactions/transaction-repository.js'
import {
  getTransactionsSchema,
  createTransactionSchema,
  updateTransactionSchema,
  getSummarySchema,
  getStatsSchema,
  getBalanceHistorySchema,
  getMonthlySummarySchema,
} from '../../validators/transaction-validators.js'

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = getTransactionsSchema.safeParse(req.query)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Parámetros inválidos',
      })
      return
    }

    const {
      account_id,
      start_date,
      end_date,
      subcategory_id,
      min_amount,
      max_amount,
      search,
      type,
      limit,
      offset,
    } = validationResult.data

    const { transactions, total } = await TransactionRepository.getByAccountIdWithPagination(
      {
        account_id,
        startDate: start_date,
        endDate: end_date,
        subcategory_id,
        minAmount: min_amount,
        maxAmount: max_amount,
        search,
        type,
        limit,
        offset,
      },
      req.user!.id
    )

    res.status(200).json({
      success: true,
      transactions,
      total,
      limit: limit || 50,
      offset: offset || 0,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getTransactions:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const transaction = await TransactionRepository.getById(id, req.user!.id)

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transacción no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      transaction,
    })
  } catch (error) {
    console.error('Error en getTransactionById:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = createTransactionSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Datos inválidos',
      })
      return
    }

    const { account_id, date, description, amount, subcategory_id, bank_category, bank_subcategory } =
      validationResult.data

    const transaction = await TransactionRepository.create(req.user!.id, {
      account_id,
      date,
      description,
      amount,
      subcategory_id: subcategory_id ?? undefined,
      bank_category: bank_category ?? undefined,
      bank_subcategory: bank_subcategory ?? undefined,
    })

    res.status(201).json({
      success: true,
      transaction,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en createTransaction:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // Validación con Zod
    const validationResult = updateTransactionSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Datos inválidos',
      })
      return
    }

    const { date, description, amount, subcategory_id } = validationResult.data

    const transaction = await TransactionRepository.update(id, req.user!.id, {
      date,
      description,
      amount,
      subcategory_id: subcategory_id ?? undefined,
    })

    if (!transaction) {
      res.status(404).json({
        success: false,
        error: 'Transacción no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      transaction,
    })
  } catch (error) {
    console.error('Error en updateTransaction:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const deleted = await TransactionRepository.delete(id, req.user!.id)

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Transacción no encontrada',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Transacción eliminada correctamente',
    })
  } catch (error) {
    console.error('Error en deleteTransaction:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const getTransactionsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = getSummarySchema.safeParse(req.query)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Parámetros inválidos',
      })
      return
    }

    const { account_id, start_date, end_date } = validationResult.data

    const summary = await TransactionRepository.getSummaryByCategory(
      account_id,
      req.user!.id,
      start_date,
      end_date
    )

    const total = await TransactionRepository.getTotalByPeriod(
      account_id,
      req.user!.id,
      start_date,
      end_date
    )

    res.status(200).json({
      success: true,
      summary,
      total,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getTransactionsSummary:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtiene estadísticas de ingresos, gastos y balance
 * GET /api/transactions/stats
 * Query: account_id, start_date?, end_date?
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = getStatsSchema.safeParse(req.query)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Parámetros inválidos',
      })
      return
    }

    const { account_id, start_date, end_date } = validationResult.data

    const transactions = await TransactionRepository.getByAccountId(
      {
        account_id,
        startDate: start_date,
        endDate: end_date,
      },
      req.user!.id
    )

    // Cálculos en el servidor
    const income = transactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = transactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

    const balance = income - expenses

    res.status(200).json({
      success: true,
      stats: {
        income,
        expenses,
        balance,
        transactionCount: transactions.length,
      },
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getStats:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtiene historial de balance acumulado para gráfico de líneas
 * GET /api/transactions/balance-history
 * Query: account_id, year
 */
export const getBalanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = getBalanceHistorySchema.safeParse(req.query)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Parámetros inválidos',
      })
      return
    }

    const { account_id, year } = validationResult.data
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const transactions = await TransactionRepository.getByAccountId(
      {
        account_id,
        startDate,
        endDate,
      },
      req.user!.id
    )

    // Generar todas las fechas del año
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const today = new Date()

    for (let d = new Date(start); d <= end && d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0])
    }

    // Agrupar transacciones por fecha
    const transactionsByDate = transactions.reduce(
      (acc, tx) => {
        const date = tx.date.split('T')[0]
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += Number(tx.amount)
        return acc
      },
      {} as Record<string, number>
    )

    // Calcular balance acumulado
    let cumulative = 0
    const balanceHistory = dates.map((date) => {
      cumulative += transactionsByDate[date] || 0
      return {
        date: date.substring(5), // MM-DD format
        fullDate: date,
        balance: Math.round(cumulative * 100) / 100,
      }
    })

    res.status(200).json({
      success: true,
      balanceHistory,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getBalanceHistory:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Obtiene resumen mensual de ingresos/gastos para gráfico de barras
 * GET /api/transactions/monthly-summary
 * Query: account_id, year
 */
export const getMonthlySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Validación con Zod
    const validationResult = getMonthlySummarySchema.safeParse(req.query)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Parámetros inválidos',
      })
      return
    }

    const { account_id, year } = validationResult.data
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    const transactions = await TransactionRepository.getByAccountId(
      {
        account_id,
        startDate,
        endDate,
      },
      req.user!.id
    )

    // Nombres de meses en español
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    // Inicializar todos los meses
    const monthlyData: Record<number, { income: number; expenses: number }> = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { income: 0, expenses: 0 }
    }

    // Agrupar por mes
    transactions.forEach((tx) => {
      const date = new Date(tx.date)
      const month = date.getMonth()
      const amount = Number(tx.amount)

      if (amount > 0) {
        monthlyData[month].income += amount
      } else {
        monthlyData[month].expenses += Math.abs(amount)
      }
    })

    // Convertir a array
    const monthlySummary = monthNames.map((name, index) => ({
      month: name,
      income: Math.round(monthlyData[index].income * 100) / 100,
      expenses: Math.round(monthlyData[index].expenses * 100) / 100,
    }))

    res.status(200).json({
      success: true,
      monthlySummary,
    })
  } catch (error) {
    const err = error as Error

    if (err.message === 'No tienes acceso a esta cuenta') {
      res.status(403).json({
        success: false,
        error: err.message,
      })
      return
    }

    console.error('Error en getMonthlySummary:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
