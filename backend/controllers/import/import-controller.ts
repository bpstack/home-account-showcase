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

    // Insert transactions in batches
    const BATCH_SIZE = 100
    let inserted = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE)
      const values: any[] = []
      const placeholders: string[] = []

      for (const tx of batch) {
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
      }

      try {
        await db.query(
          `INSERT INTO transactions (id, account_id, subcategory_id, date, description, amount, bank_category, bank_subcategory)
           VALUES ${placeholders.join(', ')}`,
          values
        )
        inserted += batch.length
      } catch (err) {
        errors.push(`Error insertando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${(err as Error).message}`)
        skipped += batch.length
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
