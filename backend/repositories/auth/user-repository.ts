// repositories/auth/user-repository.ts

import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { SALT_ROUNDS } from '../../config/config.js'
import db from '../../config/db.js'
import type {
  User,
  UserRow,
  RegisterDTO,
  LoginDTO,
} from '../../models/auth/index.js'

export class UserRepository {
  /**
   * Crear nuevo usuario + account automática
   */
  static async create({ email, password, name }: RegisterDTO): Promise<User> {
    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      const userId = crypto.randomUUID()
      const accountId = crypto.randomUUID()
      const accountUserId = crypto.randomUUID()
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

      // 1. Crear usuario
      await connection.query(
        `INSERT INTO users (id, email, password_hash, name)
         VALUES (?, ?, ?, ?)`,
        [userId, email, hashedPassword, name]
      )

      // 2. Crear account personal
      await connection.query(
        `INSERT INTO accounts (id, name)
         VALUES (?, ?)`,
        [accountId, `Cuenta de ${name}`]
      )

      // 3. Asignar usuario como owner
      await connection.query(
        `INSERT INTO account_users (id, account_id, user_id, role)
         VALUES (?, ?, ?, 'owner')`,
        [accountUserId, accountId, userId]
      )

      await connection.commit()

      return {
        id: userId,
        email,
        name,
        created_at: new Date(),
      }
    } catch (error: any) {
      await connection.rollback()

      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El email ya está registrado')
      }
      console.error('Error creating user:', error)
      throw new Error('Error interno al crear usuario')
    } finally {
      connection.release()
    }
  }

  /**
   * Login con email y password
   */
  static async login({ email, password }: LoginDTO): Promise<User> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT id, email, name, password_hash, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email]
    )

    const user = rows[0]

    // Comparación segura contra timing attacks
    const DUMMY_HASH = '$2b$10$dummyhashfortimingatttacksprevent'
    const passwordToCompare = user?.password_hash || DUMMY_HASH
    const isPasswordValid = await bcrypt.compare(password, passwordToCompare)

    if (!user) {
      throw new Error('Credenciales inválidas')
    }

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas')
    }

    // Retornar sin password_hash
    const { password_hash: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
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
}
