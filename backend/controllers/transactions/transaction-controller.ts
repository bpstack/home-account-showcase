// controllers/transactions/transaction-controller.ts

import { Request, Response } from 'express'
import { TransactionRepository } from '../../repositories/transactions/transaction-repository.js'

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
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
    } = req.query

    if (!account_id || typeof account_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'account_id es requerido',
      })
      return
    }

    const transactions = await TransactionRepository.getByAccountId(
      {
        account_id,
        startDate: start_date as string,
        endDate: end_date as string,
        subcategory_id: subcategory_id as string,
        minAmount: min_amount ? parseFloat(min_amount as string) : undefined,
        maxAmount: max_amount ? parseFloat(max_amount as string) : undefined,
        search: search as string,
        type: type as 'income' | 'expense' | 'all' | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      },
      req.user!.id
    )

    res.status(200).json({
      success: true,
      transactions,
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
    const {
      account_id,
      date,
      description,
      amount,
      subcategory_id,
      bank_category,
      bank_subcategory,
    } = req.body

    if (!account_id || !date || !description || amount === undefined) {
      res.status(400).json({
        success: false,
        error: 'account_id, date, description y amount son requeridos',
      })
      return
    }

    const transaction = await TransactionRepository.create(req.user!.id, {
      account_id,
      date,
      description,
      amount,
      subcategory_id,
      bank_category,
      bank_subcategory,
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
    const { date, description, amount, subcategory_id } = req.body

    const transaction = await TransactionRepository.update(id, req.user!.id, {
      date,
      description,
      amount,
      subcategory_id,
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
    const { account_id, start_date, end_date } = req.query

    if (!account_id || typeof account_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'account_id es requerido',
      })
      return
    }

    const summary = await TransactionRepository.getSummaryByCategory(
      account_id,
      req.user!.id,
      start_date as string,
      end_date as string
    )

    const total = await TransactionRepository.getTotalByPeriod(
      account_id,
      req.user!.id,
      start_date as string,
      end_date as string
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
