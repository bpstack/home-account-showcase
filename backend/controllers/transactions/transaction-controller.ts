// controllers/transactions/transaction-controller.ts

import { Request, Response } from 'express'
import { TransactionRepository } from '../../repositories/transactions/transaction-repository.js'
import { sanitizeForStorage } from '../../utils/sanitize.js'
import {
  getTransactionsSchema,
  createTransactionSchema,
  createEncryptedTransactionSchema,
  updateTransactionSchema,
  updateEncryptedTransactionSchema,
  bulkUpdateByIdsSchema,
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
    // Check if encrypted transaction
    const isEncrypted = 'description_encrypted' in req.body

    if (isEncrypted) {
      // Validate encrypted schema
      const validationResult = createEncryptedTransactionSchema.safeParse(req.body)
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]
        res.status(400).json({
          success: false,
          error: firstError?.message || 'Datos inválidos',
        })
        return
      }

      const transaction = await TransactionRepository.createEncrypted(
        req.user!.id,
        validationResult.data
      )

      res.status(201).json({
        success: true,
        transaction,
      })
      return
    }

    // Legacy: unencrypted transaction
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

    // Sanitize text fields to prevent XSS attacks
    const safeDescription = sanitizeForStorage(description)
    const safeBankCategory = bank_category ? sanitizeForStorage(bank_category) : undefined
    const safeBankSubcategory = bank_subcategory ? sanitizeForStorage(bank_subcategory) : undefined

    const transaction = await TransactionRepository.create(req.user!.id, {
      account_id,
      date,
      description: safeDescription,
      amount,
      subcategory_id: subcategory_id ?? undefined,
      bank_category: safeBankCategory,
      bank_subcategory: safeBankSubcategory,
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

    // Check if encrypted update
    const isEncrypted = 'description_encrypted' in req.body || 'amount_encrypted' in req.body

    if (isEncrypted) {
      // Validate encrypted schema
      const validationResult = updateEncryptedTransactionSchema.safeParse(req.body)
      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]
        res.status(400).json({
          success: false,
          error: firstError?.message || 'Datos inválidos',
        })
        return
      }

      const transaction = await TransactionRepository.updateEncrypted(
        id,
        req.user!.id,
        validationResult.data
      )

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
      return
    }

    // Legacy: unencrypted update
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

    // Sanitize text fields to prevent XSS attacks
    const safeDescription = description ? sanitizeForStorage(description) : undefined

    const transaction = await TransactionRepository.update(id, req.user!.id, {
      date,
      description: safeDescription,
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

/**
 * Actualizar categoría de múltiples transacciones por lista de IDs
 * PUT /api/transactions/bulk-update-by-ids
 * Body: account_id, transaction_ids, subcategory_id
 * Works with encrypted data - client filters decrypted transactions and sends IDs
 */
export const bulkUpdateByIds = async (req: Request, res: Response): Promise<void> => {
  try {
    const validationResult = bulkUpdateByIdsSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      res.status(400).json({
        success: false,
        error: firstError?.message || 'Datos inválidos',
      })
      return
    }

    const { account_id, transaction_ids, subcategory_id } = validationResult.data

    const updatedCount = await TransactionRepository.bulkUpdateByIds(
      account_id,
      req.user!.id,
      transaction_ids,
      subcategory_id
    )

    res.status(200).json({
      success: true,
      updatedCount,
      transaction_ids,
      subcategory_id,
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

    console.error('Error en bulkUpdateByIds:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
