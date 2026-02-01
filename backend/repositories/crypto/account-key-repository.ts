// repositories/crypto/account-key-repository.ts

import * as crypto from 'crypto'
import db from '../../config/db.js'
import type {
  AccountKey,
  AccountKeyRow,
  CreateAccountKeyDTO,
  UpdateAccountKeyDTO,
  EncryptedKeyInfo,
} from '../../models/crypto/index.js'

export class AccountKeyRepository {
  /**
   * Create a new account key
   */
  static async create({
    accountId,
    userId,
    encryptedKey,
  }: CreateAccountKeyDTO): Promise<AccountKey> {
    const id = crypto.randomUUID()

    await db.query(
      `INSERT INTO account_keys (id, account_id, user_id, encrypted_key, key_version)
       VALUES (?, ?, ?, ?, 1)`,
      [id, accountId, userId, encryptedKey]
    )

    return {
      id,
      account_id: accountId,
      user_id: userId,
      encrypted_key: encryptedKey,
      key_version: 1,
      created_at: new Date(),
    }
  }

  /**
   * Get all encrypted keys for a user (used after login)
   */
  static async getByUserId(userId: string): Promise<EncryptedKeyInfo[]> {
    const [rows] = await db.query<AccountKeyRow[]>(
      `SELECT account_id, encrypted_key, key_version
       FROM account_keys
       WHERE user_id = ?`,
      [userId]
    )

    return rows.map((row) => ({
      account_id: row.account_id,
      encrypted_key: row.encrypted_key,
      key_version: row.key_version,
    }))
  }

  /**
   * Get encrypted key for a specific account/user
   */
  static async getByAccountAndUser(accountId: string, userId: string): Promise<AccountKey | null> {
    const [rows] = await db.query<AccountKeyRow[]>(
      `SELECT * FROM account_keys
       WHERE account_id = ? AND user_id = ?`,
      [accountId, userId]
    )

    return rows[0] || null
  }

  /**
   * Update encrypted key (for password change)
   */
  static async update({ accountId, userId, encryptedKey }: UpdateAccountKeyDTO): Promise<void> {
    await db.query(
      `UPDATE account_keys
       SET encrypted_key = ?
       WHERE account_id = ? AND user_id = ?`,
      [encryptedKey, accountId, userId]
    )
  }

  /**
   * Update all keys for a user (batch update for password change)
   */
  static async updateAllForUser(
    userId: string,
    updates: Array<{ accountId: string; encryptedKey: string }>
  ): Promise<void> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      for (const { accountId, encryptedKey } of updates) {
        await connection.query(
          `UPDATE account_keys
           SET encrypted_key = ?
           WHERE account_id = ? AND user_id = ?`,
          [encryptedKey, accountId, userId]
        )
      }

      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * Delete key for an account/user (when member is removed)
   */
  static async delete(accountId: string, userId: string): Promise<void> {
    await db.query(
      `DELETE FROM account_keys
       WHERE account_id = ? AND user_id = ?`,
      [accountId, userId]
    )
  }

  /**
   * Delete all keys for a user
   */
  static async deleteAllForUser(userId: string): Promise<void> {
    await db.query(`DELETE FROM account_keys WHERE user_id = ?`, [userId])
  }
}
