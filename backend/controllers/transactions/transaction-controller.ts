import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
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

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = getTransactionsSchema.safeParse(req.query)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new AppError(firstError?.message || 'Parámetros inválidos', 400)
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
})

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const transaction = await TransactionRepository.getById(id, req.user!.id)

  if (!transaction) {
    throw new AppError('Transacción no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    transaction,
  })
})

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const isEncrypted = 'description_encrypted' in req.body

  if (isEncrypted) {
    const validationResult = createEncryptedTransactionSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      throw new AppError(firstError?.message || 'Datos inválidos', 400)
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

  const validationResult = createTransactionSchema.safeParse(req.body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new AppError(firstError?.message || 'Datos inválidos', 400)
  }

  const { account_id, date, description, amount, subcategory_id, bank_category, bank_subcategory } =
    validationResult.data

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
})

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const isEncrypted = 'description_encrypted' in req.body || 'amount_encrypted' in req.body

  if (isEncrypted) {
    const validationResult = updateEncryptedTransactionSchema.safeParse(req.body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      throw new AppError(firstError?.message || 'Datos inválidos', 400)
    }

    const transaction = await TransactionRepository.updateEncrypted(
      id,
      req.user!.id,
      validationResult.data
    )

    if (!transaction) {
      throw new AppError('Transacción no encontrada', 404)
    }

    res.status(200).json({
      success: true,
      transaction,
    })
    return
  }

  const validationResult = updateTransactionSchema.safeParse(req.body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new AppError(firstError?.message || 'Datos inválidos', 400)
  }

  const { date, description, amount, subcategory_id } = validationResult.data

  const safeDescription = description ? sanitizeForStorage(description) : undefined

  const transaction = await TransactionRepository.update(id, req.user!.id, {
    date,
    description: safeDescription,
    amount,
    subcategory_id: subcategory_id ?? undefined,
  })

  if (!transaction) {
    throw new AppError('Transacción no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    transaction,
  })
})

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const deleted = await TransactionRepository.delete(id, req.user!.id)

  if (!deleted) {
    throw new AppError('Transacción no encontrada', 404)
  }

  res.status(200).json({
    success: true,
    message: 'Transacción eliminada correctamente',
  })
})

export const bulkUpdateByIds = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = bulkUpdateByIdsSchema.safeParse(req.body)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    throw new AppError(firstError?.message || 'Datos inválidos', 400)
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
})
