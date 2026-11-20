import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import crypto from 'crypto'
import { CategoryRepository } from '../../repositories/categories/category-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import { importConfirmSchema, importHashesQuerySchema } from '../../validators/import-validators.js'
import db from '../../config/db.js'

const HMAC_HEX = '^[0-9a-f]{64}$'

/**
 * Stores an import that arrives already encrypted (ADR-008): ciphertexts, the sign of the amount,
 * a keyed hash to skip movements already imported, and the subcategory the user chose. The bank
 * category mappings are stored as keyed hashes. Nothing in plaintext reaches this handler: the
 * schema is strict and rejects any other field.
 */
export const confirmImport = asyncHandler(async (req: Request, res: Response) => {
  const validation = importConfirmSchema.safeParse(req.body)
  if (!validation.success) {
    throw new AppError(
      validation.error.issues[0]?.message || 'Datos de importación no válidos',
      400
    )
  }
  const { account_id, transactions, category_mappings } = validation.data

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  // Every subcategory must belong to this account
  const subcategoryIds = [
    ...new Set(
      [
        ...transactions.map((tx) => tx.subcategory_id),
        ...category_mappings.map((m) => m.subcategory_id),
      ].filter((id): id is string => id !== null)
    ),
  ]
  if (subcategoryIds.length > 0) {
    const [owned] = await db.query<any[]>(
      `SELECT s.id FROM subcategories s
       INNER JOIN categories c ON c.id = s.category_id
       WHERE c.account_id = ? AND s.id IN (?)`,
      [account_id, subcategoryIds]
    )
    if (owned.length !== subcategoryIds.length) {
      throw new AppError('Alguna subcategoría no pertenece a esta cuenta', 400)
    }
  }

  const [existingRows] = await db.query<any[]>(
    `SELECT import_hash FROM transactions WHERE account_id = ? AND import_hash IS NOT NULL`,
    [account_id]
  )
  const knownHashes = new Set(existingRows.map((row) => row.import_hash as string))

  const BATCH_SIZE = 100
  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    const values: unknown[] = []
    const placeholders: string[] = []
    const batchHashes: string[] = []

    for (const tx of batch) {
      if (knownHashes.has(tx.import_hash) || batchHashes.includes(tx.import_hash)) {
        skipped++
        continue
      }
      placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      values.push(
        crypto.randomUUID(),
        account_id,
        tx.subcategory_id,
        tx.date,
        tx.description_encrypted,
        tx.amount_encrypted,
        tx.amount_sign,
        tx.bank_category_encrypted,
        tx.bank_subcategory_encrypted,
        tx.import_hash
      )
      batchHashes.push(tx.import_hash)
    }

    if (placeholders.length === 0) continue

    try {
      await db.query(
        `INSERT INTO transactions (id, account_id, subcategory_id, date, description_encrypted, amount_encrypted, amount_sign, bank_category_encrypted, bank_subcategory_encrypted, import_hash)
         VALUES ${placeholders.join(', ')}`,
        values
      )
      inserted += placeholders.length
      batchHashes.forEach((h) => knownHashes.add(h))
    } catch (err) {
      errors.push(
        `Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`
      )
      skipped += placeholders.length
    }
  }

  if (category_mappings.length > 0) {
    const placeholders: string[] = []
    const values: string[] = []
    for (const mapping of category_mappings) {
      placeholders.push('(UUID(), ?, ?, ?, ?)')
      values.push(
        account_id,
        mapping.bank_category_hmac,
        mapping.bank_subcategory_hmac,
        mapping.subcategory_id
      )
    }
    try {
      // The bank_category / bank_subcategory columns hold the keyed hashes, not the bank's text
      await db.query(
        `INSERT INTO category_mappings (id, account_id, bank_category, bank_subcategory, subcategory_id)
         VALUES ${placeholders.join(', ')}
         ON DUPLICATE KEY UPDATE subcategory_id = VALUES(subcategory_id), updated_at = CURRENT_TIMESTAMP`,
        values
      )
    } catch (err) {
      console.error('Error saving category mappings:', err)
    }
  }

  res.status(200).json({
    success: true,
    data: {
      total: transactions.length,
      inserted,
      skipped,
      errors,
    },
  })
})

export const getExistingCategories = asyncHandler(async (req: Request, res: Response) => {
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const categories = await CategoryRepository.getByAccountId(account_id, req.user!.id)

  res.status(200).json({
    success: true,
    categories,
  })
})

export const getSavedMappings = asyncHandler(async (req: Request, res: Response) => {
  const { account_id } = req.query

  if (!account_id || typeof account_id !== 'string') {
    throw new AppError('account_id es requerido', 400)
  }

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  // Only keyed hashes: rows left in plaintext by the old import are not sent back (ADR-008)
  const result = await db.query<any[]>(
    `SELECT bank_category AS bank_category_hmac, bank_subcategory AS bank_subcategory_hmac,
            subcategory_id
     FROM category_mappings
     WHERE account_id = ? AND bank_category REGEXP ? AND bank_subcategory REGEXP ?`,
    [account_id, HMAC_HEX, HMAC_HEX]
  )

  res.status(200).json({
    success: true,
    mappings: result[0],
  })
})

/**
 * The import hashes already stored for an account, so the review screen can mark the movements
 * that will be skipped as duplicates. They are keyed hashes: they reveal nothing without the
 * account key, and only members of the account get them.
 */
export const getImportHashes = asyncHandler(async (req: Request, res: Response) => {
  const validation = importHashesQuerySchema.safeParse(req.query)
  if (!validation.success) {
    throw new AppError(validation.error.issues[0]?.message || 'account_id es requerido', 400)
  }
  const { account_id } = validation.data

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const [rows] = await db.query<any[]>(
    `SELECT import_hash FROM transactions WHERE account_id = ? AND import_hash IS NOT NULL`,
    [account_id]
  )

  res.status(200).json({
    success: true,
    hashes: rows.map((row) => row.import_hash as string),
  })
})
