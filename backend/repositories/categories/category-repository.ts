// repositories/categories/category-repository.ts

import crypto from 'crypto'
import db from '../../config/db.js'
import { AccountRepository } from '../accounts/account-repository.js'
import type {
  Category,
  CategoryRow,
  SubcategoryRow,
  Subcategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../models/categories/index.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

export class CategoryRepository {
  /**
   * Crear categoría
   */
  static async create(
    userId: string,
    data: CreateCategoryDTO & { name_encrypted?: string }
  ): Promise<Category> {
    const hasAccess = await AccountRepository.hasAccess(data.account_id, userId)
    if (!hasAccess) {
      throw new AppError('You do not have access to this account', 403)
    }

    const id = crypto.randomUUID()
    const color = data.color || '#6B7280'

    try {
      await db.query(
        `INSERT INTO categories (id, account_id, name, name_encrypted, color, icon)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, data.account_id, data.name, data.name_encrypted || null, color, data.icon || null]
      )

      return {
        id,
        account_id: data.account_id,
        name: data.name,
        name_encrypted: data.name_encrypted,
        color,
        icon: data.icon || null,
        created_at: new Date(),
      }
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Category with this name already exists', 409)
      }
      logger.error('CATEGORY_REPO', 'create', 'Error creating category', error)
      throw new AppError('Internal error creating category', 500)
    }
  }

  /**
   * Obtener categorías por account con subcategorías
   */
  static async getByAccountId(accountId: string, userId: string): Promise<Category[]> {
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new AppError('You do not have access to this account', 403)
    }

    const [categories] = await db.query<CategoryRow[]>(
      `SELECT id, account_id, name, name_encrypted, color, icon, created_at, updated_at
       FROM categories
       WHERE account_id = ?
       ORDER BY name ASC`,
      [accountId]
    )

    const [subcategories] = await db.query<SubcategoryRow[]>(
      `SELECT id, category_id, name, name_encrypted, created_at, updated_at
       FROM subcategories
       WHERE category_id IN (SELECT id FROM categories WHERE account_id = ?)
       ORDER BY name ASC`,
      [accountId]
    )

    const subcategoriesByCategory = new Map<string, Subcategory[]>()
    for (const sub of subcategories) {
      const list = subcategoriesByCategory.get(sub.category_id) || []
      list.push(sub)
      subcategoriesByCategory.set(sub.category_id, list)
    }

    return categories.map((cat) => ({
      ...cat,
      subcategories: subcategoriesByCategory.get(cat.id) || [],
    }))
  }

  /**
   * Obtener categoría por ID
   */
  static async getById(categoryId: string, userId: string): Promise<Category | null> {
    const [rows] = await db.query<CategoryRow[]>(
      `SELECT c.id, c.account_id, c.name, c.color, c.icon, c.created_at, c.updated_at
       FROM categories c
       INNER JOIN account_users au ON au.account_id = c.account_id
       WHERE c.id = ? AND au.user_id = ?`,
      [categoryId, userId]
    )

    return rows[0] || null
  }

  /**
   * Actualizar categoría
   */
  static async update(
    categoryId: string,
    userId: string,
    data: UpdateCategoryDTO & { name_encrypted?: string }
  ): Promise<Category | null> {
    const category = await this.getById(categoryId, userId)
    if (!category) {
      return null
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.name_encrypted !== undefined) {
      updates.push('name_encrypted = ?')
      values.push(data.name_encrypted)
    }
    if (data.color !== undefined) {
      updates.push('color = ?')
      values.push(data.color)
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?')
      values.push(data.icon)
    }

    if (updates.length === 0) {
      return category
    }

    values.push(categoryId)

    try {
      await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values)

      return this.getById(categoryId, userId)
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Category with this name already exists', 409)
      }
      throw error
    }
  }

  /**
   * How many transactions would lose their category if this one is deleted: those whose
   * subcategory belongs to it. A transaction only ever points at a subcategory, never at a
   * category, so the count goes through `subcategories`.
   */
  static async getOrphanedTransactionsCount(categoryId: string, userId: string): Promise<number> {
    const category = await this.getById(categoryId, userId)
    if (!category) {
      return 0
    }

    const [rows] = await db.query<any[]>(
      `SELECT COUNT(*) as count
       FROM transactions t
       INNER JOIN subcategories s ON s.id = t.subcategory_id
       WHERE s.category_id = ? AND t.account_id = ?`,
      [categoryId, category.account_id]
    )

    return Number(rows[0]?.count) || 0
  }

  /**
   * Before deleting a category, move its transactions to a subcategory of another category of
   * the same account.
   */
  static async reassignTransactions(
    fromCategoryId: string,
    toSubcategoryId: string,
    userId: string
  ): Promise<number> {
    const fromCategory = await this.getById(fromCategoryId, userId)
    if (!fromCategory) {
      throw new AppError('Source category not found', 404)
    }

    const [targets] = await db.query<any[]>(
      `SELECT s.category_id
       FROM subcategories s
       INNER JOIN categories c ON c.id = s.category_id
       WHERE s.id = ? AND c.account_id = ?`,
      [toSubcategoryId, fromCategory.account_id]
    )
    if (targets.length === 0) {
      throw new AppError('Destination subcategory not found', 404)
    }
    // Its own subcategories go away with it: moving there would leave them without one anyway
    if (targets[0].category_id === fromCategoryId) {
      throw new AppError('The destination must belong to another category', 400)
    }

    const [result] = await db.query<any>(
      `UPDATE transactions t
       INNER JOIN subcategories s ON s.id = t.subcategory_id
       SET t.subcategory_id = ?
       WHERE s.category_id = ? AND t.account_id = ?`,
      [toSubcategoryId, fromCategoryId, fromCategory.account_id]
    )

    return result.affectedRows
  }

  /**
   * Eliminar categoría (usa ON DELETE SET NULL automáticamente)
   */
  static async delete(categoryId: string, userId: string): Promise<boolean> {
    // Verificar acceso
    const category = await this.getById(categoryId, userId)
    if (!category) {
      return false
    }

    const [result] = await db.query<any>(`DELETE FROM categories WHERE id = ?`, [categoryId])

    return result.affectedRows > 0
  }
}
