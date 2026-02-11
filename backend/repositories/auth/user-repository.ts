// repositories/auth/user-repository.ts

import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { RowDataPacket } from 'mysql2'
import { SALT_ROUNDS } from '../../config/config.js'
import db from '../../config/db.js'
import type {
  User,
  UserRow,
  RegisterDTO,
  LoginDTO,
  UpdateUserDTO,
  CreateOAuthUserDTO,
  LinkOAuthDTO,
} from '../../models/auth/index.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

export class UserRepository {
  /**
   * Crear nuevo usuario + account automática (opcional)
   * @param skipDefaultAccount - Si true, no crea cuenta por defecto (para usuarios de invitación)
   * @param encryptedAccountKey - Encrypted AK for the new account (required if !skipDefaultAccount)
   */
  static async create({
    email,
    password,
    name,
    accountName,
    skipDefaultAccount,
    encryptedAccountKey,
  }: RegisterDTO): Promise<User & { key_salt: string; accountId?: string }> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const userId = crypto.randomUUID()
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      // Generate key_salt for encryption (64 hex chars = 32 bytes)
      const keySalt = crypto.randomBytes(32).toString('hex')

      // 1. Crear usuario con key_salt
      await connection.query(
        `INSERT INTO users (id, email, password_hash, key_salt, name)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, email, hashedPassword, keySalt, name]
      )

      let accountId: string | undefined

      // 2. Crear account personal (solo si no viene de invitación)
      if (!skipDefaultAccount) {
        accountId = crypto.randomUUID()
        const accountUserId = crypto.randomUUID()
        const finalAccountName = accountName || `Cuenta de ${name}`

        await connection.query(
          `INSERT INTO accounts (id, name, owner_id)
           VALUES (?, ?, ?)`,
          [accountId, finalAccountName, userId]
        )

        // 3. Asignar usuario como owner
        await connection.query(
          `INSERT INTO account_users (id, account_id, user_id, role)
           VALUES (?, ?, ?, 'owner')`,
          [accountUserId, accountId, userId]
        )

        // 4. Guardar encrypted account key si se proporciona
        if (encryptedAccountKey) {
          const accountKeyId = crypto.randomUUID()
          await connection.query(
            `INSERT INTO account_keys (id, account_id, user_id, encrypted_key, key_version)
             VALUES (?, ?, ?, ?, 1)`,
            [accountKeyId, accountId, userId, encryptedAccountKey]
          )
        }
      }

      await connection.commit()

      return {
        id: userId,
        email,
        name,
        key_salt: keySalt,
        accountId,
        created_at: new Date(),
      }
    } catch (error: any) {
      await connection.rollback()

      if (error.code === 'ER_DUP_ENTRY') {
        throw new AppError('Email already registered', 409)
      }
      logger.error('USER_REPO', 'create', 'Error creating user', error)
      throw new AppError('Internal error creating user', 500)
    } finally {
      connection.release()
    }
  }

  /**
   * Login con email y password
   * Devuelve key_salt para que el cliente derive la User Key
   */
  static async login({ email, password }: LoginDTO): Promise<User & { key_salt: string }> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, password_hash, key_salt, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email]
    )

    const user = rows[0]

    const DUMMY_HASH = '$2b$10$dummyhashfortimingatttacksprevent'
    const passwordToCompare = user?.password_hash || DUMMY_HASH
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare)

    if (!user) {
      throw new AppError('Invalid credentials', 401)
    }

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401)
    }

    // Retornar con key_salt pero sin password_hash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      key_salt: user.key_salt,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  }

  /**
   * Obtener usuario por ID
   */
  static async getById(id: string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    return rows[0] || null
  }

  /**
   * Obtener usuario por ID con key_salt (para recuperación de claves)
   */
  static async getByIdWithKeySalt(id: string): Promise<(User & { key_salt: string }) | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, key_salt, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    return rows[0] || null
  }

  /**
   * Obtener usuario por email
   */
  static async getByEmail(email: string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email]
    )

    return rows[0] || null
  }

  /**
   * Buscar usuario por email o nombre (case-insensitive)
   */
  static async findByEmailOrName(identifier: string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)`,
      [identifier, identifier]
    )

    return rows[0] || null
  }

  /**
   * Buscar usuario por email Y nombre (case-insensitive)
   */
  static async findByEmailAndName(email: string, name: string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER(?) AND LOWER(name) = LOWER(?)`,
      [email, name]
    )

    return rows[0] || null
  }

  /**
   * Obtener todos los usuarios
   */
  static async getAll(): Promise<User[]> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    )

    return rows as User[]
  }

  /**
   * Actualizar usuario (nombre y email)
   */
  static async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const { name, email } = data

    const [result] = await db.query(
      `UPDATE users
       SET name = COALESCE(?, name), email = COALESCE(?, email), updated_at = NOW()
       WHERE id = ?`,
      [name, email, id]
    )

    if ((result as any).affectedRows === 0) {
      return null
    }

    return this.getById(id)
  }

  /**
   * Resetear contraseña (admin)
   */
  static async resetPassword(id: string, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    const [result] = await db.query(
      `UPDATE users
       SET password_hash = ?, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, id]
    )

    return (result as any).affectedRows > 0
  }

  /**
   * Cambiar contraseña propia con re-cifrado de claves
   * @param id - User ID
   * @param currentPassword - Password actual para verificación
   * @param newPassword - Nueva contraseña
   * @param newKeySalt - Nuevo salt para derivar UK (generado en cliente)
   * @param reEncryptedKeys - Claves de cuenta re-cifradas con la nueva UK
   */
  static async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    newKeySalt?: string,
    reEncryptedKeys?: Array<{ accountId: string; encryptedKey: string }>
  ): Promise<boolean> {
    const connection = await db.getConnection()

    try {
      // Verificar password actual
      const [rows] = await connection.query<UserRow[]>(
        `SELECT password_hash FROM users WHERE id = ?`,
        [id]
      )

      const user = rows[0]
      if (!user) {
        throw new AppError('User not found', 404)
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash!)
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 401)
      }

      await connection.beginTransaction()

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

      // Actualizar password y opcionalmente key_salt
      if (newKeySalt) {
        await connection.query(
          `UPDATE users SET password_hash = ?, key_salt = ?, updated_at = NOW() WHERE id = ?`,
          [hashedPassword, newKeySalt, id]
        )
      } else {
        await connection.query(
          `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
          [hashedPassword, id]
        )
      }

      // Actualizar claves re-cifradas si se proporcionan
      if (reEncryptedKeys && reEncryptedKeys.length > 0) {
        for (const key of reEncryptedKeys) {
          await connection.query(
            `UPDATE account_keys
             SET encrypted_key = ?, key_version = key_version + 1
             WHERE account_id = ? AND user_id = ?`,
            [key.encryptedKey, key.accountId, id]
          )
        }
      }

      await connection.commit()
      return true
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

/**
    * Eliminar usuario
    */
  static async delete(id: string): Promise<boolean> {
    const [result] = await db.query(`DELETE FROM users WHERE id = ?`, [id])
    return (result as any).affectedRows > 0
  }

  // ============================================
  // OAUTH METHODS
  // ============================================

  /**
   * Buscar usuario por OAuth provider + ID
   */
  static async getByOAuth(provider: 'google' | 'github', oauthId: string): Promise<(User & { key_salt: string }) | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, key_salt, oauth_provider, oauth_id, avatar_url, created_at, updated_at
       FROM users
       WHERE oauth_provider = ? AND oauth_id = ?`,
      [provider, oauthId]
    )
    return rows[0] || null
  }

  /**
   * Obtener usuario por email (para vincular OAuth a cuenta existente)
   */
  static async getByEmailForOAuth(email: string): Promise<(User & { key_salt: string }) | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, key_salt, oauth_provider, oauth_id, avatar_url, password_hash, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email]
    )
    return rows[0] || null
  }

  /**
   * Crear usuario desde OAuth (sin password)
   */
  static async createOAuth(data: CreateOAuthUserDTO): Promise<User & { key_salt: string }> {
    const userId = crypto.randomUUID()
    const keySalt = crypto.randomBytes(32).toString('hex')

    await db.query(
      `INSERT INTO users (id, email, name, key_salt, oauth_provider, oauth_id, avatar_url, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      [userId, data.email, data.name, keySalt, data.provider, data.oauthId, data.avatar || null]
    )

    return {
      id: userId,
      email: data.email,
      name: data.name,
      key_salt: keySalt,
      oauth_provider: data.provider,
      oauth_id: data.oauthId,
      avatar_url: data.avatar,
      created_at: new Date(),
    }
  }

  /**
   * Vincular OAuth a usuario existente
   */
  static async linkOAuth(userId: string, data: LinkOAuthDTO): Promise<boolean> {
    const [result] = await db.query(
      `UPDATE users
       SET oauth_provider = ?, oauth_id = ?, avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [data.provider, data.oauthId, data.avatar || null, userId]
    )
    return (result as any).affectedRows > 0
  }

  /**
   * Verificar si usuario tiene password local
   */
  static async hasLocalPassword(userId: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT password_hash FROM users WHERE id = ?`,
      [userId]
    )
    return rows[0]?.password_hash !== null
  }
}
