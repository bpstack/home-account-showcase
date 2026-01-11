// repositories/transactions/transaction-repository.ts

import crypto from 'crypto'
import db from '../../config/db.js'
import { AccountRepository } from '../accounts/account-repository.js'
import type {
  Transaction,
  TransactionRow,
  TransactionWithDetails,
  TransactionWithDetailsRow,
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilters,
} from '../../models/transactions/index.js'

export class TransactionRepository {
  /**
   * Crear transacción
   */
  static async create(userId: string, data: CreateTransactionDTO): Promise<Transaction> {
    const hasAccess = await AccountRepository.hasAccess(data.account_id, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    const id = crypto.randomUUID()

    await db.query(
      `INSERT INTO transactions (id, account_id, subcategory_id, date, description, amount, bank_category, bank_subcategory)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.account_id,
        data.subcategory_id || null,
        data.date,
        data.description,
        data.amount,
        data.bank_category || null,
        data.bank_subcategory || null,
      ]
    )

    return {
      id,
      account_id: data.account_id,
      subcategory_id: data.subcategory_id || null,
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      bank_category: data.bank_category || null,
      bank_subcategory: data.bank_subcategory || null,
      created_at: new Date(),
    }
  }

  /**
   * Obtener transacciones con filtros
   */
  static async getByAccountId(filters: TransactionFilters, userId: string): Promise<TransactionWithDetails[]> {
    const hasAccess = await AccountRepository.hasAccess(filters.account_id, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    let query = `
      SELECT 
        t.id, t.account_id, t.subcategory_id, t.date, t.description, t.amount,
        t.bank_category, t.bank_subcategory, t.created_at, t.updated_at,
        s.name as subcategory_name,
        c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE t.account_id = ?
    `
    const params: any[] = [filters.account_id]

    if (filters.startDate) {
      query += ' AND t.date >= ?'
      params.push(filters.startDate)
    }

    if (filters.endDate) {
      query += ' AND t.date <= ?'
      params.push(filters.endDate)
    }

    if (filters.subcategory_id) {
      query += ' AND t.subcategory_id = ?'
      params.push(filters.subcategory_id)
    }

    if (filters.minAmount !== undefined) {
      query += ' AND t.amount >= ?'
      params.push(filters.minAmount)
    }

    if (filters.maxAmount !== undefined) {
      query += ' AND t.amount <= ?'
      params.push(filters.maxAmount)
    }

    if (filters.search) {
      query += ' AND t.description LIKE ?'
      params.push(`%${filters.search}%`)
    }

    query += ' ORDER BY t.date DESC, t.created_at DESC'

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }

    if (filters.offset) {
      query += ' OFFSET ?'
      params.push(filters.offset)
    }

    const [rows] = await db.query<TransactionWithDetailsRow[]>(query, params)

    return rows
  }

  /**
   * Obtener transacción por ID
   */
  static async getById(transactionId: string, userId: string): Promise<TransactionWithDetails | null> {
    const [rows] = await db.query<TransactionWithDetailsRow[]>(
      `SELECT 
        t.id, t.account_id, t.subcategory_id, t.date, t.description, t.amount,
        t.bank_category, t.bank_subcategory, t.created_at, t.updated_at,
        s.name as subcategory_name,
        c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN subcategories s ON t.subcategory_id = s.id
       LEFT JOIN categories c ON s.category_id = c.id
       INNER JOIN account_users au ON au.account_id = t.account_id
       WHERE t.id = ? AND au.user_id = ?`,
      [transactionId, userId]
    )

    return rows[0] || null
  }

  /**
   * Actualizar transacción
   */
  static async update(transactionId: string, userId: string, data: UpdateTransactionDTO): Promise<TransactionWithDetails | null> {
    const transaction = await this.getById(transactionId, userId)
    if (!transaction) {
      return null
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.date !== undefined) {
      updates.push('date = ?')
      values.push(data.date)
    }

    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }

    if (data.amount !== undefined) {
      updates.push('amount = ?')
      values.push(data.amount)
    }

    if (data.subcategory_id !== undefined) {
      updates.push('subcategory_id = ?')
      values.push(data.subcategory_id)
    }

    if (updates.length === 0) {
      return transaction
    }

    values.push(transactionId)

    await db.query(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values)

    return this.getById(transactionId, userId)
  }

  /**
   * Eliminar transacción
   */
  static async delete(transactionId: string, userId: string): Promise<boolean> {
    const transaction = await this.getById(transactionId, userId)
    if (!transaction) {
      return false
    }

    const [result] = await db.query<any>(`DELETE FROM transactions WHERE id = ?`, [transactionId])

    return result.affectedRows > 0
  }

  /**
   * Resumen por categoría (para dashboard)
   */
  static async getSummaryByCategory(accountId: string, userId: string, startDate?: string, endDate?: string): Promise<any[]> {
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    let query = `
      SELECT 
        COALESCE(c.name, 'Sin categoría') as category_name,
        COALESCE(c.color, '#6B7280') as category_color,
        COALESCE(s.name, 'Sin subcategoría') as subcategory_name,
        SUM(t.amount) as total_amount,
        COUNT(*) as transaction_count
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE t.account_id = ?
    `
    const params: any[] = [accountId]

    if (startDate) {
      query += ' AND t.date >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND t.date <= ?'
      params.push(endDate)
    }

    query += ` GROUP BY c.id, s.id ORDER BY total_amount DESC`

    const [rows] = await db.query<any[]>(query, params)

    return rows
  }

  /**
   * Total por periodo
   */
  static async getTotalByPeriod(accountId: string, userId: string, startDate?: string, endDate?: string): Promise<number> {
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    let query = 'SELECT SUM(amount) as total FROM transactions WHERE account_id = ?'
    const params: any[] = [accountId]

    if (startDate) {
      query += ' AND date >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND date <= ?'
      params.push(endDate)
    }

    const [rows] = await db.query<any[]>(query, params)

    return rows[0]?.total || 0
  }
}
