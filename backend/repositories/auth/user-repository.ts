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
   * @param verificationBlob - Verification blob for PIN validation
   */
  static async create({
    email,
    password,
    name,
    accountName,
    skipDefaultAccount,
    encryptedAccountKey,
    verificationBlob,
  }: RegisterDTO): Promise<User & { key_salt: string; accountId?: string }> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const userId = crypto.randomUUID()
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
      const keySalt = crypto.randomBytes(32).toString('hex')

      await connection.query(
        `INSERT INTO users (id, email, password_hash, key_salt, verification_blob, name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, email, hashedPassword, keySalt, verificationBlob || null, name]
      )

      let accountId: string | undefined

      if (!skipDefaultAccount) {
        accountId = crypto.randomUUID()
        const accountUserId = crypto.randomUUID()
        const finalAccountName = accountName || `Cuenta de ${name}`

        await connection.query(
          `INSERT INTO accounts (id, name, owner_id)
           VALUES (?, ?, ?)`,
          [accountId, finalAccountName, userId]
        )

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
  static async login({
    email,
    password,
  }: LoginDTO): Promise<
    User & { key_salt: string; verification_blob: string | null; email_verified: boolean }
  > {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, password_hash, key_salt, verification_blob, email_verified, created_at, updated_at
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
      verification_blob: user.verification_blob ?? null,
      email_verified: user.email_verified === true || (user.email_verified as unknown) === 1,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
  }

  /**
   * Obtener usuario por ID
   */
  static async getById(id: string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, oauth_provider, email_verified, pending_email, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    return rows[0] || null
  }

  /**
   * Obtener usuario por ID con key_salt (para recuperación de claves)
   */
  static async getByIdWithKeySalt(
    id: string
  ): Promise<(User & { key_salt: string; verification_blob: string | null }) | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, key_salt, verification_blob, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id]
    )

    const row = rows[0]
    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      name: row.name,
      key_salt: row.key_salt,
      verification_blob: row.verification_blob ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
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
   * Cambiar PIN de cifrado E2E
   * - NO modifica password_hash (PIN es independiente de la contraseña de login)
   * - La verificación del PIN actual la hace el frontend (descifra Account Keys)
   * - Actualiza key_salt, verification_blob y re-cifra Account Keys
   */
  static async changePin(
    id: string,
    _currentPassword: string,
    _newPin: string,
    newKeySalt: string,
    verificationBlob: string,
    reEncryptedKeys: Array<{ accountId: string; encryptedKey: string }>
  ): Promise<boolean> {
    const connection = await db.getConnection()

    try {
      const [rows] = await connection.query<UserRow[]>(`SELECT id FROM users WHERE id = ?`, [id])

      if (!rows[0]) {
        throw new AppError('User not found', 404)
      }

      await connection.beginTransaction()

      // Solo actualizar key_salt y verification_blob, NO password_hash
      await connection.query(
        `UPDATE users 
         SET key_salt = ?, verification_blob = ?, updated_at = NOW() 
         WHERE id = ?`,
        [newKeySalt, verificationBlob, id]
      )

      for (const key of reEncryptedKeys) {
        await connection.query(
          `UPDATE account_keys
           SET encrypted_key = ?, key_version = key_version + 1
           WHERE account_id = ? AND user_id = ?`,
          [key.encryptedKey, key.accountId, id]
        )
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
  static async getByOAuth(
    provider: 'google' | 'github',
    oauthId: string
  ): Promise<(User & { key_salt: string }) | null> {
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
   * OAuth users have email_verified = true since OAuth provider already verified
   */
  static async createOAuth(data: CreateOAuthUserDTO): Promise<User & { key_salt: string }> {
    const userId = crypto.randomUUID()
    const keySalt = crypto.randomBytes(32).toString('hex')

    await db.query(
      `INSERT INTO users (id, email, name, key_salt, oauth_provider, oauth_id, avatar_url, password_hash, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, TRUE)`,
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
    const [rows] = await db.query<RowDataPacket[]>(`SELECT password_hash FROM users WHERE id = ?`, [
      userId,
    ])
    return rows[0]?.password_hash !== null
  }

  // ============================================
  // PIN LOCKOUT METHODS
  // ============================================

  /**
   * Check and update PIN attempt counter. Returns remaining attempts.
   * Throws AppError if locked out.
   */
  static async checkPinAttempt(userId: string): Promise<{ remaining: number }> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT pin_attempts, pin_locked_until FROM users WHERE id = ?`,
      [userId]
    )
    const user = rows[0]
    if (!user) throw new AppError('User not found', 404)

    // Check if currently locked out
    if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.pin_locked_until).getTime() - Date.now()) / 60000
      )
      throw new AppError(`PIN bloqueado. Intenta en ${minutesLeft} minutos.`, 429)
    }

    return { remaining: 5 - (user.pin_attempts || 0) }
  }

  /**
   * Record a failed PIN attempt. Lock if >= 5 attempts.
   */
  static async recordFailedPinAttempt(
    userId: string
  ): Promise<{ remaining: number; locked: boolean }> {
    const [rows] = await db.query<UserRow[]>(`SELECT pin_attempts FROM users WHERE id = ?`, [
      userId,
    ])
    const attempts = (rows[0]?.pin_attempts || 0) + 1
    const locked = attempts >= 5

    if (locked) {
      await db.query(
        `UPDATE users SET pin_attempts = ?, pin_locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?`,
        [attempts, userId]
      )
    } else {
      await db.query(`UPDATE users SET pin_attempts = ? WHERE id = ?`, [attempts, userId])
    }

    return { remaining: Math.max(0, 5 - attempts), locked }
  }

  /**
   * Reset PIN attempts on successful unlock.
   */
  static async resetPinAttempts(userId: string): Promise<void> {
    await db.query(`UPDATE users SET pin_attempts = 0, pin_locked_until = NULL WHERE id = ?`, [
      userId,
    ])
  }

  // ============================================
  // BIP39 LOCKOUT METHODS
  // ============================================

  /**
   * Record a failed BIP39 attempt. Lock if >= 5 attempts.
   */
  static async recordFailedBip39Attempt(
    userId: string
  ): Promise<{ remaining: number; locked: boolean }> {
    const [rows] = await db.query<UserRow[]>(`SELECT bip39_attempts FROM users WHERE id = ?`, [
      userId,
    ])
    const attempts = (rows[0]?.bip39_attempts || 0) + 1
    const locked = attempts >= 5

    if (locked) {
      await db.query(
        `UPDATE users SET bip39_attempts = ?, bip39_locked_until = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?`,
        [attempts, userId]
      )
    } else {
      await db.query(`UPDATE users SET bip39_attempts = ? WHERE id = ?`, [attempts, userId])
    }

    return { remaining: Math.max(0, 5 - attempts), locked }
  }

  /**
   * Check BIP39 attempt status. Throws AppError if locked out.
   */
  static async checkBip39Attempt(userId: string): Promise<{ remaining: number }> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT bip39_attempts, bip39_locked_until FROM users WHERE id = ?`,
      [userId]
    )
    const user = rows[0]
    if (!user) throw new AppError('User not found', 404)

    if (user.bip39_locked_until && new Date(user.bip39_locked_until) > new Date()) {
      const minutesLeft = Math.ceil(
        (new Date(user.bip39_locked_until).getTime() - Date.now()) / 60000
      )
      throw new AppError(`Recuperación bloqueada. Intenta en ${minutesLeft} minutos.`, 429)
    }

    return { remaining: 5 - (user.bip39_attempts || 0) }
  }

  /**
   * Reset BIP39 attempts after successful recovery.
   */
  static async resetBip39Attempts(userId: string): Promise<void> {
    await db.query(`UPDATE users SET bip39_attempts = 0, bip39_locked_until = NULL WHERE id = ?`, [
      userId,
    ])
  }

  // ============================================
  // EMAIL VERIFICATION METHODS
  // ============================================

  /**
   * Buscar usuario por email (para reenvío de verificación)
   */
  static async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, email_verified, oauth_provider
       FROM users WHERE email = ?`,
      [email.toLowerCase().trim()]
    )
    return rows[0] || null
  }

  /**
   * Guardar token de verificación para un usuario
   */
  static async setVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.query(
      `UPDATE users
       SET verification_token = ?, verification_token_expires = ?
       WHERE id = ?`,
      [token, expiresAt, userId]
    )
    logger.info('USER_REPO', 'setVerificationToken', 'Token set', { userId })
  }

  /**
   * Verificar token y obtener usuario
   * Retorna null si el token es inválido o expirado
   */
  static async verifyEmailToken(token: string, email: string): Promise<UserRow | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT * FROM users
       WHERE email = ?
         AND verification_token = ?
         AND verification_token_expires > NOW()`,
      [email.toLowerCase().trim(), token]
    )

    if (!rows[0]) {
      logger.warn('USER_REPO', 'verifyEmailToken', 'Invalid or expired token', { email })
      return null
    }

    return rows[0]
  }

  /**
   * Marcar email como verificado y limpiar token
   */
  static async markEmailAsVerified(userId: string): Promise<void> {
    await db.query(
      `UPDATE users
       SET email_verified = TRUE,
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE id = ?`,
      [userId]
    )
    logger.info('USER_REPO', 'markEmailAsVerified', 'Email verified', { userId })
  }

  /**
   * Verificar si un usuario tiene email verificado
   */
  static async isEmailVerified(userId: string): Promise<boolean> {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT email_verified FROM users WHERE id = ?`,
      [userId]
    )
    return rows[0]?.email_verified === true || rows[0]?.email_verified === 1
  }

  /**
   * Save verification blob for a user (used during crypto setup)
   */
  static async saveVerificationBlob(userId: string, verificationBlob: string): Promise<void> {
    await db.query(`UPDATE users SET verification_blob = ? WHERE id = ?`, [
      verificationBlob,
      userId,
    ])
    logger.info('USER_REPO', 'saveVerificationBlob', 'Verification blob saved', { userId })
  }

  /**
   * Save encrypted account key during initial setup (before email verification)
   */
  static async saveAccountKeyForSetup(
    userId: string,
    accountId: string,
    encryptedKey: string
  ): Promise<void> {
    // Check if key already exists
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT id FROM account_keys WHERE account_id = ? AND user_id = ?`,
      [accountId, userId]
    )

    if (existing.length > 0) {
      // Update existing key
      await db.query(
        `UPDATE account_keys SET encrypted_key = ? WHERE account_id = ? AND user_id = ?`,
        [encryptedKey, accountId, userId]
      )
    } else {
      // Insert new key
      const keyId = crypto.randomUUID()
      await db.query(
        `INSERT INTO account_keys (id, account_id, user_id, encrypted_key, key_version)
         VALUES (?, ?, ?, ?, 1)`,
        [keyId, accountId, userId, encryptedKey]
      )
    }
    logger.info('USER_REPO', 'saveAccountKeyForSetup', 'Account key saved', { userId, accountId })
  }

  // ============================================
  // EMAIL CHANGE
  // ============================================

  /**
   * Iniciar proceso de cambio de email
   * Guarda el nuevo email como pendiente hasta que se verifique
   * @returns true si se inició correctamente, false si el email ya está en uso
   */
  static async initiateEmailChange(
    userId: string,
    newEmail: string,
    token: string,
    expiresAt: Date
  ): Promise<boolean> {
    // Check if new email is already in use
    const [existing] = await db.query<UserRow[]>(
      `SELECT id FROM users WHERE email = ? AND id != ?`,
      [newEmail.toLowerCase().trim(), userId]
    )

    if (existing.length > 0) {
      return false // Email already in use
    }

    await db.query(
      `UPDATE users
       SET pending_email = ?,
           email_change_token = ?,
           email_change_token_expires = ?
       WHERE id = ?`,
      [newEmail.toLowerCase().trim(), token, expiresAt, userId]
    )

    logger.info('USER_REPO', 'initiateEmailChange', 'Email change initiated', {
      userId,
      newEmail,
    })
    return true
  }

  /**
   * Completar cambio de email - verificar token y actualizar
   * @returns { userId, oldEmail, newEmail } si exitoso, null si token inválido
   */
  static async completeEmailChange(
    token: string
  ): Promise<{ userId: string; oldEmail: string; newEmail: string } | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, pending_email
       FROM users
       WHERE email_change_token = ?
         AND email_change_token_expires > NOW()
         AND pending_email IS NOT NULL`,
      [token]
    )

    if (!rows[0] || !rows[0].pending_email) {
      return null
    }

    const { id: userId, email: oldEmail, pending_email: newEmail } = rows[0]

    // Update email and clear change fields
    // Also reset email_verified so user must verify the new email
    await db.query(
      `UPDATE users
       SET email = ?,
           email_verified = FALSE,
           pending_email = NULL,
           email_change_token = NULL,
           email_change_token_expires = NULL,
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE id = ?`,
      [newEmail, userId]
    )

    logger.info('USER_REPO', 'completeEmailChange', 'Email changed', {
      userId,
      oldEmail,
      newEmail,
    })

    return { userId, oldEmail, newEmail }
  }

  /**
   * Cancelar cambio de email pendiente
   */
  static async cancelEmailChange(userId: string): Promise<void> {
    await db.query(
      `UPDATE users
       SET pending_email = NULL,
           email_change_token = NULL,
           email_change_token_expires = NULL
       WHERE id = ?`,
      [userId]
    )
    logger.info('USER_REPO', 'cancelEmailChange', 'Email change cancelled', { userId })
  }

  /**
   * Obtener email pendiente de cambio
   */
  static async getPendingEmail(userId: string): Promise<string | null> {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT pending_email FROM users WHERE id = ?`, [
      userId,
    ])
    return rows[0]?.pending_email || null
  }
}
