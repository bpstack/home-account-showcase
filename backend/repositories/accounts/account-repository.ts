// repositories/accounts/account-repository.ts

import * as crypto from 'crypto'
import db from '../../config/db.js'
import type {
  Account,
  AccountRow,
  AccountWithRole,
  AccountWithRoleRow,
  AccountUserRow,
  CreateAccountDTO,
  UpdateAccountDTO,
  AccountRole,
} from '../../models/accounts/index.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

const MAX_OWNED_ACCOUNTS = 3

export class AccountRepository {
  /**
   * Contar cuentas donde el usuario es owner
   */
  static async countOwnedAccounts(userId: string): Promise<number> {
    const [rows] = await db.query<any[]>(
      `SELECT COUNT(*) as count FROM accounts WHERE owner_id = ?`,
      [userId]
    )
    return rows[0]?.count || 0
  }

  /**
   * Crear account con owner
   */
  static async create({ name, userId }: CreateAccountDTO): Promise<Account> {
    const ownedCount = await this.countOwnedAccounts(userId)
    if (ownedCount >= MAX_OWNED_ACCOUNTS) {
      throw new AppError('Account limit reached', 400)
    }
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const accountId = crypto.randomUUID()
      const accountUserId = crypto.randomUUID()

      await connection.query(`INSERT INTO accounts (id, name, owner_id) VALUES (?, ?, ?)`, [
        accountId,
        name,
        userId,
      ])

      await connection.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'owner')`,
        [accountUserId, accountId, userId]
      )

      await connection.commit()

      return {
        id: accountId,
        name,
        owner_id: userId,
        created_at: new Date(),
      }
    } catch (error) {
      await connection.rollback()
      logger.error('ACCOUNT_REPO', 'create', 'Error creating account', error as Error)
      throw new AppError('Internal error creating account', 500)
    } finally {
      connection.release()
    }
  }

  /**
   * Obtener accounts del usuario
   */
  static async getByUserId(userId: string): Promise<AccountWithRole[]> {
    const [rows] = await db.query<AccountWithRoleRow[]>(
      `SELECT a.id, a.name, a.owner_id, a.created_at, a.updated_at, au.role
       FROM accounts a
       INNER JOIN account_users au ON au.account_id = a.id
       WHERE au.user_id = ?
       ORDER BY a.created_at DESC`,
      [userId]
    )

    return rows
  }

  /**
   * Obtener account por ID (verificando acceso del usuario)
   */
  static async getById(accountId: string, userId: string): Promise<AccountWithRole | null> {
    const [rows] = await db.query<AccountWithRoleRow[]>(
      `SELECT a.id, a.name, a.owner_id, a.created_at, a.updated_at, au.role
       FROM accounts a
       INNER JOIN account_users au ON au.account_id = a.id
       WHERE a.id = ? AND au.user_id = ?`,
      [accountId, userId]
    )

    return rows[0] || null
  }

  /**
   * Actualizar nombre del account (solo owner)
   */
  static async update(
    accountId: string,
    userId: string,
    { name }: UpdateAccountDTO
  ): Promise<Account | null> {
    const role = await this.getUserRole(accountId, userId)

    if (role !== 'owner') {
      throw new AppError('Only the owner can modify the account', 403)
    }

    await db.query(`UPDATE accounts SET name = ? WHERE id = ?`, [name, accountId])

    const [rows] = await db.query<AccountRow[]>(
      `SELECT id, name, owner_id, created_at, updated_at FROM accounts WHERE id = ?`,
      [accountId]
    )

    return rows[0] || null
  }

  /**
   * Eliminar account (solo owner)
   */
  static async delete(accountId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRole(accountId, userId)

    if (role !== 'owner') {
      throw new AppError('Only the owner can delete the account', 403)
    }

    const [result] = await db.query<any>(`DELETE FROM accounts WHERE id = ?`, [accountId])

    return result.affectedRows > 0
  }

  /**
   * Obtener rol del usuario en el account
   */
  static async getUserRole(accountId: string, userId: string): Promise<AccountRole | null> {
    const [rows] = await db.query<AccountUserRow[]>(
      `SELECT role FROM account_users WHERE account_id = ? AND user_id = ?`,
      [accountId, userId]
    )

    return rows[0]?.role || null
  }

  /**
   * Verificar si usuario tiene acceso al account
   */
  static async hasAccess(accountId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRole(accountId, userId)
    return role !== null
  }

  // addMember eliminado - ahora se usa el sistema de invitaciones
  // Ver: repositories/invitations/invitation-repository.ts

  /**
   * Remover miembro del account (solo owner)
   */
  static async removeMember(
    accountId: string,
    ownerId: string,
    memberId: string
  ): Promise<boolean> {
    const role = await this.getUserRole(accountId, ownerId)

    if (role !== 'owner') {
      throw new AppError('Only the owner can remove members', 403)
    }

    if (ownerId === memberId) {
      throw new AppError('The owner cannot remove themselves', 400)
    }

    const [result] = await db.query<any>(
      `DELETE FROM account_users WHERE account_id = ? AND user_id = ?`,
      [accountId, memberId]
    )

    return result.affectedRows > 0
  }

  /**
   * Copiar categorías por defecto a una cuenta
   */
  static async copyDefaultCategories(
    accountId: string
  ): Promise<{ categories: number; subcategories: number }> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const [defaultCategories] = await connection.query<any[]>(
        `SELECT id, name, color, icon, subcategories FROM default_categories`
      )

      let categoriesCount = 0
      let subcategoriesCount = 0

      for (const dc of defaultCategories) {
        const [existing] = await connection.query<any[]>(
          `SELECT id FROM categories WHERE account_id = ? AND name = ?`,
          [accountId, dc.name]
        )

        let categoryId: string

        if (existing.length > 0) {
          categoryId = existing[0].id
          categoriesCount++
        } else {
          categoryId = crypto.randomUUID()
          await connection.query(
            `INSERT INTO categories (id, account_id, name, color, icon)
             VALUES (?, ?, ?, ?, ?)`,
            [categoryId, accountId, dc.name, dc.color, dc.icon]
          )
          categoriesCount++
        }

        const subcategories: string[] =
          typeof dc.subcategories === 'string' ? JSON.parse(dc.subcategories) : dc.subcategories

        for (const subName of subcategories) {
          const [subExisting] = await connection.query<any[]>(
            `SELECT id FROM subcategories WHERE category_id = ? AND name = ?`,
            [categoryId, subName]
          )

          if (subExisting.length === 0) {
            const subId = crypto.randomUUID()
            await connection.query(
              `INSERT INTO subcategories (id, category_id, name) VALUES (?, ?, ?)`,
              [subId, categoryId, subName]
            )
            subcategoriesCount++
          }
        }
      }

      await connection.commit()

      return { categories: categoriesCount, subcategories: subcategoriesCount }
    } catch (error) {
      await connection.rollback()
      logger.error('ACCOUNT_REPO', 'copyDefaultCategories', 'Error copying default categories', error as Error)
      throw new AppError('Error copying default categories', 500)
    } finally {
      connection.release()
    }
  }

  /**
   * Crear account con owner Y copiar categorías por defecto
   */
  static async createWithDefaults({ name, userId, encryptedAccountKey }: CreateAccountDTO): Promise<{
    account: Account
    categoriesCopied: { categories: number; subcategories: number }
  }> {
    const ownedCount = await this.countOwnedAccounts(userId)
    if (ownedCount >= MAX_OWNED_ACCOUNTS) {
      throw new AppError('Account limit reached', 400)
    }

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const accountId = crypto.randomUUID()
      const accountUserId = crypto.randomUUID()

      await connection.query(`INSERT INTO accounts (id, name, owner_id) VALUES (?, ?, ?)`, [
        accountId,
        name,
        userId,
      ])

      await connection.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'owner')`,
        [accountUserId, accountId, userId]
      )

      if (encryptedAccountKey) {
        const accountKeyId = crypto.randomUUID()
        await connection.query(
          `INSERT INTO account_keys (id, account_id, user_id, encrypted_key, key_version)
           VALUES (?, ?, ?, ?, 1)`,
          [accountKeyId, accountId, userId, encryptedAccountKey]
        )
      }

      const [defaultCategories] = await connection.query<any[]>(
        `SELECT id, name, color, icon, subcategories FROM default_categories`
      )

      let categoriesCount = 0
      let subcategoriesCount = 0

      for (const dc of defaultCategories) {
        const categoryId = crypto.randomUUID()

        await connection.query(
          `INSERT INTO categories (id, account_id, name, color, icon)
           VALUES (?, ?, ?, ?, ?)`,
          [categoryId, accountId, dc.name, dc.color, dc.icon]
        )
        categoriesCount++

        const subcategories: string[] =
          typeof dc.subcategories === 'string' ? JSON.parse(dc.subcategories) : dc.subcategories

        for (const subName of subcategories) {
          const subId = crypto.randomUUID()
          await connection.query(
            `INSERT INTO subcategories (id, category_id, name) VALUES (?, ?, ?)`,
            [subId, categoryId, subName]
          )
          subcategoriesCount++
        }
      }

      await connection.commit()

      return {
        account: {
          id: accountId,
          name,
          owner_id: userId,
          created_at: new Date(),
        },
        categoriesCopied: { categories: categoriesCount, subcategories: subcategoriesCount },
      }
    } catch (error) {
      await connection.rollback()
      logger.error('ACCOUNT_REPO', 'createWithDefaults', 'Error creating account with defaults', error as Error)
      throw new AppError('Internal error creating account', 500)
    } finally {
      connection.release()
    }
  }

  /**
   * Obtener miembros del account
   */
  static async getMembers(accountId: string, userId: string): Promise<any[]> {
    const hasAccess = await this.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new AppError('You do not have access to this account', 403)
    }

    const [rows] = await db.query<any[]>(
      `SELECT u.id, u.email, u.name, au.role, au.created_at as joined_at
       FROM users u
       INNER JOIN account_users au ON au.user_id = u.id
       WHERE au.account_id = ?
       ORDER BY au.role DESC, au.created_at ASC`,
      [accountId]
    )

    return rows
  }

  static async leaveAccount(accountId: string, userId: string): Promise<void> {
    const role = await this.getUserRole(accountId, userId)

    if (role === null) {
      throw new AppError('You do not have access to this account', 403)
    }

    if (role === 'owner') {
      throw new AppError('The owner cannot leave the account. Transfer ownership first.', 400)
    }

    await db.query(`DELETE FROM account_users WHERE account_id = ? AND user_id = ?`, [
      accountId,
      userId,
    ])
  }
}
