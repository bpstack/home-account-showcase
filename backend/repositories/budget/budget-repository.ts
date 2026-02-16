// repositories/budget/budget-repository.ts

import { randomUUID } from 'crypto'
import db from '../../config/db.js'
import type { CategoryBudgetRow, CreateBudgetDTO, UpdateBudgetDTO } from '../../models/budget/index.js'
import { AppError } from '../../utils/app-error.js'

export class BudgetRepository {
  /**
   * Obtener todos los presupuestos de una cuenta
   */
  static async getByAccountId(accountId: string): Promise<CategoryBudgetRow[]> {
    const [rows] = await db.query<CategoryBudgetRow[]>(
      `SELECT * FROM category_budgets WHERE account_id = ? ORDER BY created_at DESC`,
      [accountId]
    )
    return rows
  }

  /**
   * Obtener un presupuesto por ID
   */
  static async getById(id: string): Promise<CategoryBudgetRow | null> {
    const [rows] = await db.query<CategoryBudgetRow[]>(
      `SELECT * FROM category_budgets WHERE id = ?`,
      [id]
    )
    return rows[0] || null
  }

  /**
   * Obtener presupuesto por categoría
   */
  static async getByCategoryId(accountId: string, categoryId: string): Promise<CategoryBudgetRow | null> {
    const [rows] = await db.query<CategoryBudgetRow[]>(
      `SELECT * FROM category_budgets WHERE account_id = ? AND category_id = ?`,
      [accountId, categoryId]
    )
    return rows[0] || null
  }

  /**
   * Crear presupuesto
   */
  static async create(data: CreateBudgetDTO): Promise<CategoryBudgetRow> {
    // Check if budget already exists for this category
    const existing = await BudgetRepository.getByCategoryId(data.account_id, data.category_id)
    if (existing) {
      throw new AppError('Ya existe un presupuesto para esta categoría', 400)
    }

    const id = randomUUID()
    const period = data.period || 'monthly'
    const alertThreshold = data.alert_threshold || 80

    await db.query(
      `INSERT INTO category_budgets (id, account_id, category_id, amount, period, alert_threshold) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.account_id, data.category_id, data.amount, period, alertThreshold]
    )

    const created = await BudgetRepository.getById(id)
    if (!created) {
      throw new AppError('Error al crear presupuesto', 500)
    }
    return created
  }

  /**
   * Actualizar presupuesto
   */
  static async update(id: string, data: UpdateBudgetDTO): Promise<CategoryBudgetRow> {
    const existing = await BudgetRepository.getById(id)
    if (!existing) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.amount !== undefined) {
      updates.push('amount = ?')
      values.push(data.amount)
    }
    if (data.period !== undefined) {
      updates.push('period = ?')
      values.push(data.period)
    }
    if (data.alert_threshold !== undefined) {
      updates.push('alert_threshold = ?')
      values.push(data.alert_threshold)
    }

    if (updates.length === 0) {
      return existing
    }

    values.push(id)
    await db.query(
      `UPDATE category_budgets SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    )

    const updated = await BudgetRepository.getById(id)
    return updated!
  }

  /**
   * Eliminar presupuesto
   */
  static async delete(id: string): Promise<void> {
    const existing = await BudgetRepository.getById(id)
    if (!existing) {
      throw new AppError('Presupuesto no encontrado', 404)
    }

    await db.query(`DELETE FROM category_budgets WHERE id = ?`, [id])
  }
}
