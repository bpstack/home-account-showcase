import { Request, Response } from 'express'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import db from '../../config/db.js'
import { SALT_ROUNDS } from '../../config/config.js'
import type { UserRow } from '../../models/auth/index.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../services/auth/tokenService.js'
import { generateCSRFToken, createCSRFCookieOptions } from '../../services/auth/csrfService.js'
import { sendPasswordResetEmail } from '../../services/email/email-service.js'
import { sendVerificationTokenEmail } from './email-verification-controller.js'
import { logger } from '../../utils/logger.js'
import {
  registerSchema,
  loginSchema,
  changePinSchema,
  type RegisterInput,
  type LoginInput,
  type ChangePinInput,
} from '../../validators/auth-validators.js'
import { asyncHandler } from '../../utils/async-handler.js'
import { AppError } from '../../utils/app-error.js'

const isProduction = process.env.NODE_ENV === 'production'

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 15 * 60 * 1000,
  path: '/',
}

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ('none' as const) : ('lax' as const),
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
}

const csrfCookieOptions = createCSRFCookieOptions()

export const register = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = registerSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw new AppError(validationResult.error.issues[0]?.message || 'Invalid data', 400)
  }

  const { email, password, name, accountName, skipDefaultAccount, encryptedAccountKey } =
    validationResult.data as RegisterInput

  const result = await UserRepository.create({
    email,
    password,
    name,
    accountName,
    skipDefaultAccount,
    encryptedAccountKey,
  })

  // Send verification email (don't block registration if it fails)
  const emailSent = await sendVerificationTokenEmail(result.id, email, name)
  if (!emailSent) {
    logger.warn('AUTH', 'register', 'Verification email failed but user created', {
      userId: result.id,
    })
  }

  // Don't generate tokens - user must verify email first
  const user = {
    id: result.id,
    email: result.email,
    name: result.name,
    created_at: result.created_at,
  }

  res.status(201).json({
    success: true,
    message: 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
    emailVerified: false,
    user,
    // Include key_salt and accountId so frontend can complete encryption setup
    // before redirecting to verify-sent (no session tokens, just crypto setup)
    key_salt: result.key_salt,
    accountId: result.accountId,
  })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = loginSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw new AppError(validationResult.error.issues[0]?.message || 'Invalid data', 400)
  }

  const { email, password } = validationResult.data as LoginInput
  const userWithSalt = await UserRepository.login({ email, password })

  // Check if email is verified
  const isVerified = await UserRepository.isEmailVerified(userWithSalt.id)
  if (!isVerified) {
    res.status(403).json({
      success: false,
      error: 'Debes verificar tu email antes de iniciar sesión.',
      code: 'EMAIL_NOT_VERIFIED',
      email: userWithSalt.email,
    })
    return
  }

  const encryptedKeys = await AccountKeyRepository.getByUserId(userWithSalt.id)

  const accessToken = await generateAccessToken({ id: userWithSalt.id, email: userWithSalt.email })
  const refreshToken = await generateRefreshToken({
    id: userWithSalt.id,
    email: userWithSalt.email,
  })
  const csrfToken = generateCSRFToken()

  res.cookie('accessToken', accessToken, accessTokenCookieOptions)
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
  res.cookie('csrfToken', csrfToken, csrfCookieOptions)

  const user = {
    id: userWithSalt.id,
    email: userWithSalt.email,
    name: userWithSalt.name,
    email_verified: userWithSalt.email_verified,
    created_at: userWithSalt.created_at,
    updated_at: userWithSalt.updated_at,
  }

  res.status(200).json({
    success: true,
    user,
    key_salt: userWithSalt.key_salt,
    verification_blob: userWithSalt.verification_blob || null,
    encrypted_keys: encryptedKeys,
    csrfToken,
  })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserRepository.getById(req.user!.id)
  if (!user) {
    throw new AppError('User not found', 404)
  }
  res.status(200).json({ success: true, user })
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshTokenFromBody = req.body?.refreshToken
  if (refreshTokenFromBody) {
    throw new AppError('Refresh token must come from httpOnly cookie', 400)
  }

  const refreshToken = req.cookies?.refreshToken
  if (!refreshToken) {
    throw new AppError('Refresh token not provided', 401)
  }

  const decoded = await verifyToken(refreshToken)
  const user = await UserRepository.getById(decoded.id)
  if (!user) {
    throw new AppError('User not found', 401)
  }

  const newAccessToken = await generateAccessToken({ id: user.id, email: user.email })
  const newCSRFToken = generateCSRFToken()

  res.cookie('accessToken', newAccessToken, accessTokenCookieOptions)
  res.cookie('csrfToken', newCSRFToken, csrfCookieOptions)

  res.status(200).json({ success: true, csrfToken: newCSRFToken })
})

export const getKeys = asyncHandler(async (req: Request, res: Response) => {
  const [rows] = await db.query<UserRow[]>(
    `SELECT key_salt, verification_blob, bip39_verified FROM users WHERE id = ?`,
    [req.user!.id]
  )
  const user = rows[0]
  if (!user) {
    throw new AppError('User not found', 404)
  }

  const encryptedKeys = await AccountKeyRepository.getByUserId(req.user!.id)

  res.status(200).json({
    success: true,
    key_salt: user.key_salt,
    verification_blob: user.verification_blob || null,
    bip39_verified: user.bip39_verified || false,
    encrypted_keys: encryptedKeys,
  })
})

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword, newKeySalt, reEncryptedKeys } = req.body

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400)
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400)
  }

  if (newKeySalt && (!reEncryptedKeys || reEncryptedKeys.length === 0)) {
    throw new AppError('If salt is changed, re-encrypted keys must be provided', 400)
  }

  await UserRepository.changePassword(
    req.user!.id,
    currentPassword,
    newPassword,
    newKeySalt,
    reEncryptedKeys
  )

  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })

  res.status(200).json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  })
})

export const changePin = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = changePinSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw new AppError(validationResult.error.issues[0]?.message || 'Invalid data', 400)
  }

  const { currentPassword, newPin, newKeySalt, verificationBlob, reEncryptedKeys } =
    validationResult.data as ChangePinInput

  await UserRepository.changePin(
    req.user!.id,
    currentPassword,
    newPin,
    newKeySalt,
    verificationBlob,
    reEncryptedKeys
  )

  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })

  res.status(200).json({
    success: true,
    message: 'PIN changed successfully. Please log in again.',
  })
})

export const saveVerificationBlob = asyncHandler(async (req: Request, res: Response) => {
  const { verificationBlob } = req.body

  if (!verificationBlob || typeof verificationBlob !== 'string') {
    throw new AppError('Verification blob is required', 400)
  }

  await db.query(`UPDATE users SET verification_blob = ? WHERE id = ?`, [
    verificationBlob,
    req.user!.id,
  ])

  res.status(200).json({ success: true })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie('accessToken', { path: '/' })
  res.clearCookie('refreshToken', { path: '/' })
  res.clearCookie('csrfToken', { path: '/' })

  res.status(200).json({ success: true, message: 'Session closed successfully' })
})

// ============================================
// BIP39 RECOVERY ENDPOINTS
// ============================================

export const saveRecoveryBlob = asyncHandler(async (req: Request, res: Response) => {
  const { recoveryBlob, recoverySalt } = req.body

  if (!recoveryBlob || typeof recoveryBlob !== 'string') {
    throw new AppError('Recovery blob is required', 400)
  }
  if (!recoverySalt || typeof recoverySalt !== 'string' || recoverySalt.length !== 64) {
    throw new AppError('Recovery salt is required (64-char hex)', 400)
  }

  await db.query(
    `UPDATE users SET recovery_blob = ?, recovery_salt = ?, bip39_verified = TRUE WHERE id = ?`,
    [recoveryBlob, recoverySalt, req.user!.id]
  )

  res.status(200).json({ success: true })
})

export const getRecoveryInfo = asyncHandler(async (req: Request, res: Response) => {
  const [rows] = await db.query<UserRow[]>(
    `SELECT recovery_blob, recovery_salt, bip39_verified,
            bip39_attempts, bip39_locked_until
     FROM users WHERE id = ?`,
    [req.user!.id]
  )

  const user = rows[0]
  if (!user) throw new AppError('User not found', 404)

  if (!user.recovery_blob || !user.recovery_salt) {
    throw new AppError('BIP39 recovery not configured', 404)
  }

  // Check lockout
  await UserRepository.checkBip39Attempt(req.user!.id)

  res.status(200).json({
    success: true,
    recovery_blob: user.recovery_blob,
    recovery_salt: user.recovery_salt,
  })
})

export const recoverWithBip39 = asyncHandler(async (req: Request, res: Response) => {
  const { newKeySalt, verificationBlob, recoveryBlob, reEncryptedKeys } = req.body

  if (!newKeySalt || !verificationBlob || !recoveryBlob || !reEncryptedKeys?.length) {
    throw new AppError('Missing required fields for recovery', 400)
  }

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Update user: new key_salt, verification_blob, recovery_blob, reset attempts
    await connection.query(
      `UPDATE users
       SET key_salt = ?, verification_blob = ?, recovery_blob = ?,
           pin_attempts = 0, pin_locked_until = NULL,
           bip39_attempts = 0, bip39_locked_until = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [newKeySalt, verificationBlob, recoveryBlob, req.user!.id]
    )

    // Update all account keys
    for (const key of reEncryptedKeys) {
      await connection.query(
        `UPDATE account_keys
         SET encrypted_key = ?, key_version = key_version + 1
         WHERE account_id = ? AND user_id = ?`,
        [key.encryptedKey, key.accountId, req.user!.id]
      )
    }

    await connection.commit()

    // Clear cookies to force re-login with new PIN
    res.clearCookie('accessToken', { path: '/' })
    res.clearCookie('refreshToken', { path: '/' })
    res.clearCookie('csrfToken', { path: '/' })

    res.status(200).json({
      success: true,
      message: 'Recovery successful. Please log in with your new PIN.',
    })
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

export const recordFailedBip39 = asyncHandler(async (req: Request, res: Response) => {
  const result = await UserRepository.recordFailedBip39Attempt(req.user!.id)
  res.status(200).json({ success: true, ...result })
})

export const recordFailedPin = asyncHandler(async (req: Request, res: Response) => {
  const result = await UserRepository.recordFailedPinAttempt(req.user!.id)
  res.status(200).json({ success: true, ...result })
})

export const resetPinAttempts = asyncHandler(async (req: Request, res: Response) => {
  await UserRepository.resetPinAttempts(req.user!.id)
  res.status(200).json({ success: true })
})

// ============================================
// PASSWORD RESET ENDPOINTS
// ============================================

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body

  if (!email || typeof email !== 'string') {
    throw new AppError('Email is required', 400)
  }

  // ALWAYS return success (anti-enumeration)
  // Do the work in the background
  const [rows] = await db.query<UserRow[]>(
    `SELECT id, name, email, oauth_provider, password_hash FROM users WHERE email = ?`,
    [email.trim().toLowerCase()]
  )

  const user = rows[0]

  if (user) {
    // Don't allow reset for OAuth-only users (they have no password)
    if (user.oauth_provider && user.oauth_provider !== 'local' && !user.password_hash) {
      // Silently skip — don't reveal that the account is OAuth
    } else {
      // Generate token
      const rawToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store hash in DB
      await db.query(
        `UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?`,
        [tokenHash, expires, user.id]
      )

      // Build reset link
      const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const resetLink = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`

      // Send email (fire and forget to avoid timing leaks)
      sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name || 'Usuario',
        resetLink,
      }).catch((err) => {
        logger.error('AUTH', 'forgotPassword', 'Failed to send reset email', String(err))
      })
    }
  }

  // Always return same response
  res.status(200).json({
    success: true,
    message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña.',
  })
})

export const getResetInfo = asyncHandler(async (req: Request, res: Response) => {
  const { email, token } = req.query
  if (!email || !token || typeof email !== 'string' || typeof token !== 'string') {
    throw new AppError('Email and token are required', 400)
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const [rows] = await db.query<UserRow[]>(
    `SELECT id, reset_token_hash, reset_token_expires, key_salt, recovery_blob, recovery_salt
     FROM users
     WHERE email = ? AND reset_token_hash IS NOT NULL`,
    [email.trim().toLowerCase()]
  )

  const user = rows[0]
  if (!user) throw new AppError('Token inválido o expirado', 400)

  const hashMatch = crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(user.reset_token_hash!, 'hex')
  )
  if (!hashMatch) throw new AppError('Token inválido o expirado', 400)
  if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    throw new AppError('Token expirado. Solicita un nuevo enlace.', 400)
  }

  const encryptedKeys = await AccountKeyRepository.getByUserId(user.id)

  res.status(200).json({
    success: true,
    key_salt: user.key_salt,
    recovery_blob: user.recovery_blob || null,
    recovery_salt: user.recovery_salt || null,
    encrypted_keys: encryptedKeys,
  })
})

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, newPassword, newKeySalt, newVerificationBlob, reEncryptedKeys, newRecoveryBlob, clearAccountKeys } = req.body

  if (!email || !token || !newPassword) {
    throw new AppError('Email, token, and new password are required', 400)
  }

  if (newPassword.length < 6) {
    throw new AppError('La contraseña debe tener al menos 6 caracteres', 400)
  }

  // Hash the incoming token to compare with DB
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  const [rows] = await db.query<UserRow[]>(
    `SELECT id, reset_token_hash, reset_token_expires
     FROM users
     WHERE email = ? AND reset_token_hash IS NOT NULL`,
    [email.trim().toLowerCase()]
  )

  const user = rows[0]

  if (!user) {
    throw new AppError('Token inválido o expirado', 400)
  }

  // Constant-time comparison
  const hashMatch = crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(user.reset_token_hash!, 'hex')
  )

  if (!hashMatch) {
    throw new AppError('Token inválido o expirado', 400)
  }

  // Check expiry
  if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    await db.query(
      `UPDATE users SET reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?`,
      [user.id]
    )
    throw new AppError('Token expirado. Solicita un nuevo enlace.', 400)
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    // COALESCE: only overwrite crypto fields if new values are provided
    await connection.query(
      `UPDATE users
       SET password_hash = ?,
           key_salt = COALESCE(?, key_salt),
           verification_blob = COALESCE(?, verification_blob),
           recovery_blob = COALESCE(?, recovery_blob),
           reset_token_hash = NULL,
           reset_token_expires = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [
        hashedPassword,
        newKeySalt || null,
        newVerificationBlob || null,
        newRecoveryBlob || null,
        user.id,
      ]
    )

    // Re-encrypt account keys if provided (atomic with password update)
    if (Array.isArray(reEncryptedKeys) && reEncryptedKeys.length > 0) {
      for (const key of reEncryptedKeys) {
        await connection.query(
          `UPDATE account_keys
           SET encrypted_key = ?, key_version = key_version + 1
           WHERE account_id = ? AND user_id = ?`,
          [key.encryptedKey, key.accountId, user.id]
        )
      }
    }

    // When no BIP39 re-encryption, account keys encrypted with old UserKey are
    // irrecoverable — delete them so login can create fresh ones via the
    // complete-crypto-setup fallback path. Also null out recovery_blob.
    if (clearAccountKeys) {
      await connection.query(`DELETE FROM account_keys WHERE user_id = ?`, [user.id])
      await connection.query(`UPDATE users SET recovery_blob = NULL WHERE id = ?`, [user.id])
    }

    await connection.commit()
  } catch (err) {
    await connection.rollback()
    throw err
  } finally {
    connection.release()
  }

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
  })
})
