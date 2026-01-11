// repositories/subcategories/subcategory-repository.ts

import crypto from 'crypto'
import db from '../../config/db.js'
import { CategoryRepository } from '../categories/category-repository.js'
import type {
  Subcategory,
  SubcategoryRow,
  CreateSubcategoryDTO,
  UpdateSubcategoryDTO,
} from '../../models/subcategories/index.js'

export class SubcategoryRepository {
  /**
   * Verificar que el usuario tiene acceso a la categoría
   */
  private static async verifyCategoryAccess(categoryId: string, userId: string): Promise<boolean> {
    const category = await CategoryRepository.getById(categoryId, userId)
    return category !== null
  }

  /**
   * Crear subcategoría
   */
  static async create(userId: string, data: CreateSubcategoryDTO): Promise<Subcategory> {
    const hasAccess = await this.verifyCategoryAccess(data.category_id, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta categoría')
    }

    const id = crypto.randomUUID()

    try {
      await db.query(
        `INSERT INTO subcategories (id, category_id, name)
         VALUES (?, ?, ?)`,
        [id, data.category_id, data.name]
      )

      return {
        id,
        category_id: data.category_id,
        name: data.name,
        created_at: new Date(),
      }
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una subcategoría con ese nombre en esta categoría')
      }
      console.error('Error creating subcategory:', error)
      throw new Error('Error interno al crear subcategoría')
    }
  }

  /**
   * Obtener subcategorías por categoría
   */
  static async getByCategoryId(categoryId: string, userId: string): Promise<Subcategory[]> {
    const hasAccess = await this.verifyCategoryAccess(categoryId, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta categoría')
    }

    const [rows] = await db.query<SubcategoryRow[]>(
      `SELECT id, category_id, name, created_at, updated_at
       FROM subcategories
       WHERE category_id = ?
       ORDER BY name ASC`,
      [categoryId]
    )

    return rows
  }

  /**
   * Obtener subcategoría por ID
   */
  static async getById(subcategoryId: string, userId: string): Promise<Subcategory | null> {
    const [rows] = await db.query<SubcategoryRow[]>(
      `SELECT s.id, s.category_id, s.name, s.created_at, s.updated_at
       FROM subcategories s
       INNER JOIN categories c ON c.id = s.category_id
       INNER JOIN account_users au ON au.account_id = c.account_id
       WHERE s.id = ? AND au.user_id = ?`,
      [subcategoryId, userId]
    )

    return rows[0] || null
  }

  /**
   * Actualizar subcategoría
   */
  static async update(subcategoryId: string, userId: string, data: UpdateSubcategoryDTO): Promise<Subcategory | null> {
    const subcategory = await this.getById(subcategoryId, userId)
    if (!subcategory) {
      return null
    }

    if (data.name === undefined) {
      return subcategory
    }

    try {
      await db.query(
        `UPDATE subcategories SET name = ? WHERE id = ?`,
        [data.name, subcategoryId]
      )

      return this.getById(subcategoryId, userId)
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Ya existe una subcategoría con ese nombre en esta categoría')
      }
      throw error
    }
  }

  /**
   * Eliminar subcategoría
   */
  static async delete(subcategoryId: string, userId: string): Promise<boolean> {
    const subcategory = await this.getById(subcategoryId, userId)
    if (!subcategory) {
      return false
    }

    const [result] = await db.query<any>(
      `DELETE FROM subcategories WHERE id = ?`,
      [subcategoryId]
    )

    return result.affectedRows > 0
  }
}
