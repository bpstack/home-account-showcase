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

export class CategoryRepository {
  /**
   * Crear categoría
   */
  static async create(userId: string, data: CreateCategoryDTO): Promise<Category> {
    // Verificar acceso al account
    const hasAccess = await AccountRepository.hasAccess(data.account_id, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    const id = crypto.randomUUID()
    const color = data.color || '#6B7280'

    try {
      await db.query(
        `INSERT INTO categories (id, account_id, name, color, icon)
         VALUES (?, ?, ?, ?, ?)`,
        [id, data.account_id, data.name, color, data.icon || null]
      )

      return {
        id,
        account_id: data.account_id,
        name: data.name,
        color,
        icon: data.icon || null,
        created_at: new Date(),
      }
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una categoría con ese nombre')
      }
      console.error('Error creating category:', error)
      throw new Error('Error interno al crear categoría')
    }
  }

  /**
   * Obtener categorías por account con subcategorías
   */
  static async getByAccountId(accountId: string, userId: string): Promise<Category[]> {
    // Verificar acceso
    const hasAccess = await AccountRepository.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
    }

    // Obtener categorías
    const [categories] = await db.query<CategoryRow[]>(
      `SELECT id, account_id, name, color, icon, created_at, updated_at
       FROM categories
       WHERE account_id = ?
       ORDER BY name ASC`,
      [accountId]
    )

    // Obtener subcategorías para cada categoría
    const [subcategories] = await db.query<SubcategoryRow[]>(
      `SELECT id, category_id, name, created_at, updated_at
       FROM subcategories
       WHERE category_id IN (SELECT id FROM categories WHERE account_id = ?)
       ORDER BY name ASC`,
      [accountId]
    )

    // Agrupar subcategorías por categoría
    const subcategoriesByCategory = new Map<string, Subcategory[]>()
    for (const sub of subcategories) {
      const list = subcategoriesByCategory.get(sub.category_id) || []
      list.push(sub)
      subcategoriesByCategory.set(sub.category_id, list)
    }

    // Combinar categorías con sus subcategorías
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
    data: UpdateCategoryDTO
  ): Promise<Category | null> {
    // Verificar acceso
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
        throw new Error('Ya existe una categoría con ese nombre')
      }
      throw error
    }
  }

  /**
   * Obtener conteo de transacciones huérfanas al borrar categoría
   */
  static async getOrphanedTransactionsCount(categoryId: string, userId: string): Promise<number> {
    const category = await this.getById(categoryId, userId)
    if (!category) {
      return 0
    }

    const [rows] = await db.query<any[]>(
      `SELECT COUNT(*) as count FROM transactions WHERE subcategory_id = ?`,
      [categoryId]
    )

    return rows[0]?.count || 0
  }

  /**
   * Reasignar transacciones a otra subcategoría antes de borrar
   */
  static async reassignTransactions(
    fromCategoryId: string,
    toCategoryId: string,
    userId: string
  ): Promise<number> {
    // Verificar acceso a ambas categorías
    const fromCategory = await this.getById(fromCategoryId, userId)
    if (!fromCategory) {
      throw new Error('Categoría de origen no encontrada')
    }

    const toCategory = await this.getById(toCategoryId, userId)
    if (!toCategory) {
      throw new Error('Categoría de destino no encontrada')
    }

    // Verificar que ambas pertenecen al mismo account
    if (fromCategory.account_id !== toCategory.account_id) {
      throw new Error('Las categorías deben pertenecer a la misma cuenta')
    }

    const [result] = await db.query<any>(
      `UPDATE transactions SET subcategory_id = ? WHERE subcategory_id = ?`,
      [toCategoryId, fromCategoryId]
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
