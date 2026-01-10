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
   * Crear nuevo usuario
   */
  static async create({ email, password, name }: RegisterDTO): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
    const uuid = crypto.randomUUID()

    try {
      await db.query(
        `INSERT INTO users (id, email, password_hash, name)
         VALUES (?, ?, ?, ?)`,
        [uuid, email, hashedPassword, name]
      )

      return {
        id: uuid,
        email,
        name,
        created_at: new Date(),
      }
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('El email ya está registrado')
      }
      console.error('Error creating user:', error)
      throw new Error('Error interno al crear usuario')
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
