import { Request, Response } from 'express'
import crypto from 'crypto'
import {
  parseExcelFile,
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

export const parseFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ningún archivo',
      })
      return
    }

    const sheetName = req.body.sheet_name as string | undefined
    const result = parseExcelFile(req.file.buffer, sheetName)

    res.status(200).json({
      success: result.success,
      data: result,
    })
  } catch (error) {
    console.error('Error en parseFile:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const confirmImport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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
      res.status(400).json({
        success: false,
        error: 'account_id es requerido',
      })
      return
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No hay transacciones para importar',
      })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta cuenta',
      })
      return
    }

    // Build mapping lookup
    const mappingLookup = new Map<string, string | null>()
    if (category_mappings) {
      for (const mapping of category_mappings) {
        const key = `${mapping.bank_category}|${mapping.bank_subcategory}`
        mappingLookup.set(key, mapping.subcategory_id)
      }
    }

    // Check for existing transactions to avoid duplicates
    const existingTxQuery = await db.query<any[]>(
      `SELECT 
         DATE_FORMAT(date, '%Y-%m-%d') as tx_date, 
         REPLACE(REPLACE(REPLACE(LOWER(TRIM(description)), '\r', ''), '\n', ''), '.', '') as tx_desc, 
         ROUND(amount, 2) as tx_amount
       FROM transactions WHERE account_id = ?`,
      [account_id]
    )

    const existingSet = new Set(
      existingTxQuery[0].map((tx) => `${tx.tx_date}|${tx.tx_desc}|${tx.tx_amount}`)
    )

    const normalizeDesc = (desc: string) =>
      desc
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n\t]/g, '')
        .replace(/[.,¿?¡!¿:'"]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
    const normalizeAmount = (amt: number) => Math.round(amt * 100) / 100
    const normalizeDate = (date: string) => date.split('T')[0] || date

    // Insert transactions in batches
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
        const txAmount = normalizeAmount(parseFloat(String(tx.amount)))
        const txDesc = normalizeDesc(tx.description)
        const txKey = `${normalizeDate(tx.date)}|${txDesc}|${txAmount}`

        // Check both DB and already inserted in this batch
        if (existingSet.has(txKey) || insertedKeys.has(txKey)) {
          skipped++
          continue
        }

        const id = crypto.randomUUID()
        const mappingKey = `${tx.bank_category}|${tx.bank_subcategory}`
        const subcategoryId = mappingLookup.get(mappingKey) || null

        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?)')
        values.push(
          id,
          account_id,
          subcategoryId,
          tx.date,
          tx.description,
          tx.amount,
          tx.bank_category,
          tx.bank_subcategory
        )
        batchKeys.push(txKey)
      }

      if (placeholders.length === 0) continue

      try {
        await db.query(
          `INSERT INTO transactions (id, account_id, subcategory_id, date, description, amount, bank_category, bank_subcategory)
           VALUES ${placeholders.join(', ')}`,
          values
        )
        inserted += placeholders.length
        batchKeys.forEach((k) => insertedKeys.add(k))
      } catch (err) {
        errors.push(`Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`)
        skipped += placeholders.length
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
  } catch (error) {
    console.error('Error en confirmImport:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

export const getExistingCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { account_id } = req.query

    if (!account_id || typeof account_id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'account_id es requerido',
      })
      return
    }

    const hasAccess = await AccountRepository.hasAccess(account_id, req.user!.id)
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta cuenta',
      })
      return
    }

    const categories = await CategoryRepository.getByAccountId(account_id, req.user!.id)

    res.status(200).json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Error en getExistingCategories:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}
