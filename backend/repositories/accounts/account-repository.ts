// repositories/accounts/account-repository.ts

import crypto from 'crypto'
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

export class AccountRepository {
  /**
   * Crear account con owner
   */
  static async create({ name, userId }: CreateAccountDTO): Promise<Account> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const accountId = crypto.randomUUID()
      const accountUserId = crypto.randomUUID()

      // Crear account
      await connection.query(
        `INSERT INTO accounts (id, name) VALUES (?, ?)`,
        [accountId, name]
      )

      // Asignar usuario como owner
      await connection.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'owner')`,
        [accountUserId, accountId, userId]
      )

      await connection.commit()

      return {
        id: accountId,
        name,
        created_at: new Date(),
      }
    } catch (error) {
      await connection.rollback()
      console.error('Error creating account:', error)
      throw new Error('Error interno al crear cuenta')
    } finally {
      connection.release()
    }
  }

  /**
   * Obtener accounts del usuario
   */
  static async getByUserId(userId: string): Promise<AccountWithRole[]> {
    const [rows] = await db.query<AccountWithRoleRow[]>(
      `SELECT a.id, a.name, a.created_at, a.updated_at, au.role
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
      `SELECT a.id, a.name, a.created_at, a.updated_at, au.role
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
  static async update(accountId: string, userId: string, { name }: UpdateAccountDTO): Promise<Account | null> {
    // Verificar que es owner
    const role = await this.getUserRole(accountId, userId)

    if (role !== 'owner') {
      throw new Error('Solo el owner puede modificar la cuenta')
    }

    await db.query(
      `UPDATE accounts SET name = ? WHERE id = ?`,
      [name, accountId]
    )

    const [rows] = await db.query<AccountRow[]>(
      `SELECT id, name, created_at, updated_at FROM accounts WHERE id = ?`,
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
      throw new Error('Solo el owner puede eliminar la cuenta')
    }

    const [result] = await db.query<any>(
      `DELETE FROM accounts WHERE id = ?`,
      [accountId]
    )

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

  /**
   * Agregar miembro al account (solo owner)
   */
  static async addMember(accountId: string, ownerId: string, memberId: string): Promise<void> {
    const role = await this.getUserRole(accountId, ownerId)

    if (role !== 'owner') {
      throw new Error('Solo el owner puede agregar miembros')
    }

    const accountUserId = crypto.randomUUID()

    try {
      await db.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'member')`,
        [accountUserId, accountId, memberId]
      )
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El usuario ya es miembro de esta cuenta')
      }
      throw error
    }
  }

  /**
   * Remover miembro del account (solo owner)
   */
  static async removeMember(accountId: string, ownerId: string, memberId: string): Promise<boolean> {
    const role = await this.getUserRole(accountId, ownerId)

    if (role !== 'owner') {
      throw new Error('Solo el owner puede remover miembros')
    }

    // No permitir que el owner se remueva a sí mismo
    if (ownerId === memberId) {
      throw new Error('El owner no puede removerse a sí mismo')
    }

    const [result] = await db.query<any>(
      `DELETE FROM account_users WHERE account_id = ? AND user_id = ?`,
      [accountId, memberId]
    )

    return result.affectedRows > 0
  }

  /**
   * Obtener miembros del account
   */
  static async getMembers(accountId: string, userId: string): Promise<any[]> {
    // Verificar acceso
    const hasAccess = await this.hasAccess(accountId, userId)
    if (!hasAccess) {
      throw new Error('No tienes acceso a esta cuenta')
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
}
