import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'
import { Request, Response } from 'express'
import crypto from 'crypto'
import {
  parseFile as parseImportFile,
  type ParsedTransaction,
} from '../../services/import/excel-parser.js'
import { CategoryRepository } from '../../repositories/categories/category-repository.js'
import { SubcategoryRepository } from '../../repositories/subcategories/subcategory-repository.js'
import { AccountRepository } from '../../repositories/accounts/account-repository.js'
import db from '../../config/db.js'

interface CategoryMapping {
  bank_category: string
  bank_subcategory: string
  subcategory_id: string | null
}

export const parseFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No se ha proporcionado ningún archivo', 400)
  }

  const sheetName = req.body.sheet_name as string | undefined
  const filename = req.file.originalname || 'file.xlsx'
  const result = parseImportFile(req.file.buffer, filename, sheetName)

  res.status(200).json({
    success: result.success,
    data: result,
  })
})

export const confirmImport = asyncHandler(async (req: Request, res: Response) => {
  const {
    account_id,
    transactions,
    category_mappings,
  }: {
    account_id: string
    transactions: ParsedTransaction[]
    category_mappings: CategoryMapping[]
  } = req.body

  if (!account_id) {
    throw new AppError('account_id es requerido', 400)
  }

  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    throw new AppError('No hay transacciones para importar', 400)
  }

  const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
  if (!hasAccess) {
    throw new AppError('No tienes acceso a esta cuenta', 403)
  }

  const mappingLookup = new Map<string, string | null>()
  if (category_mappings) {
    for (const mapping of category_mappings) {
      const key = `${mapping.bank_category}|${mapping.bank_subcategory}`
      mappingLookup.set(key, mapping.subcategory_id)
    }
  }

  const isEncrypted = transactions.length > 0 && !!(transactions[0] as any).description_encrypted

  const normalizeDesc = (desc: string) =>
    desc
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\r\n\t]/g, '')
      .replace(/[.,¿?¡!¿:'"]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
  const normalizeAmount = (amt: number) => (Math.round(amt * 100) / 100).toFixed(2)
  const normalizeDate = (date: string) => date.split('T')[0] || date

  const existingTxQuery = await db.query<any[]>(
    `SELECT
       DATE_FORMAT(date, '%Y-%m-%d') as tx_date,
       description as tx_desc,
       amount as tx_amount
     FROM transactions WHERE account_id = ?`,
    [account_id]
  )

  const existingSet = new Set(
    existingTxQuery[0].map(
      (tx) =>
        `${tx.tx_date}|${normalizeDesc(tx.tx_desc || '')}|${normalizeAmount(parseFloat(tx.tx_amount))}`
    )
  )

  const BATCH_SIZE = 100
  let inserted = 0
  let skipped = 0
  const errors: string[] = []
  const insertedKeys = new Set<string>()

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    const values: any[] = []
    const placeholders: string[] = []
    const batchKeys: string[] = []

    for (const tx of batch) {
      const txAny = tx as any
      const txAmount = normalizeAmount(parseFloat(String(tx.amount)))
      const txDesc = normalizeDesc(tx.description || '')
      const txKey = `${normalizeDate(tx.date)}|${txDesc}|${txAmount}`

      if (existingSet.has(txKey) || insertedKeys.has(txKey)) {
        skipped++
        continue
      }

      const id = crypto.randomUUID()
      const mappingKey = `${tx.bank_category}|${tx.bank_subcategory}`
      const subcategoryId = mappingLookup.get(mappingKey) || null

      if (isEncrypted) {
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        values.push(
          id,
          account_id,
          subcategoryId,
          tx.date,
          null,
          null,
          txAny.description_encrypted,
          txAny.amount_encrypted,
          txAny.amount_sign,
          txAny.bank_category_encrypted,
          txAny.bank_subcategory_encrypted,
          tx.bank_category
        )
      } else {
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        values.push(
          id,
          account_id,
          subcategoryId,
          tx.date,
          tx.description,
          tx.amount,
          null,
          null,
          null,
          null,
          null,
          tx.bank_category
        )
      }
      batchKeys.push(txKey)
    }

    if (placeholders.length === 0) continue

    try {
      await db.query(
        `INSERT INTO transactions (id, account_id, subcategory_id, date, description, amount, description_encrypted, amount_encrypted, amount_sign, bank_category_encrypted, bank_subcategory_encrypted, bank_category)
         VALUES ${placeholders.join(', ')}`,
        values
      )
      inserted += placeholders.length
      batchKeys.forEach((k) => insertedKeys.add(k))
    } catch (err) {
      errors.push(
        `Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`
      )
      skipped += placeholders.length
    }
  }

  if (category_mappings && category_mappings.length > 0) {
    const validMappings = category_mappings.filter((m) => m.subcategory_id)
    if (validMappings.length > 0) {
      const mappingPlaceholders: string[] = []
      const mappingValues: any[] = []

      for (const mapping of validMappings) {
        mappingPlaceholders.push('(UUID(), ?, ?, ?, ?)')
        mappingValues.push(
          account_id,
          mapping.bank_category,
          mapping.bank_subcategory,
          mapping.subcategory_id
        )
      }

      try {
        await db.query(
          `INSERT INTO category_mappings (id, account_id, bank_category, bank_subcategory, subcategory_id)
           VALUES ${mappingPlaceholders.join(', ')}
           ON DUPLICATE KEY UPDATE subcategory_id = VALUES(subcategory_id), updated_at = CURRENT_TIMESTAMP`,
          mappingValues
        )
      } catch (err) {
        console.error('Error saving category mappings:', err)
      }
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

  const result = await db.query<any[]>(
    `SELECT bank_category, bank_subcategory, subcategory_id
     FROM category_mappings
     WHERE account_id = ?`,
    [account_id]
  )

  res.status(200).json({
    success: true,
    mappings: result[0],
  })
})
