import { Request, Response } from 'express'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { AccountKeyRepository } from '../../repositories/crypto/account-key-repository.js'
import db from '../../config/db.js'
import type { UserRow } from '../../models/auth/index.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../services/auth/tokenService.js'
import { generateCSRFToken, createCSRFCookieOptions } from '../../services/auth/csrfService.js'
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

  const accessToken = await generateAccessToken({ id: result.id, email: result.email })
  const refreshToken = await generateRefreshToken({ id: result.id, email: result.email })
  const csrfToken = generateCSRFToken()

  res.cookie('accessToken', accessToken, accessTokenCookieOptions)
  res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions)
  res.cookie('csrfToken', csrfToken, csrfCookieOptions)

  const user = {
    id: result.id,
    email: result.email,
    name: result.name,
    created_at: result.created_at,
  }

  res.status(201).json({
    success: true,
    user,
    key_salt: result.key_salt,
    accountId: result.accountId,
    csrfToken,
  })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const validationResult = loginSchema.safeParse(req.body)
  if (!validationResult.success) {
    throw new AppError(validationResult.error.issues[0]?.message || 'Invalid data', 400)
  }

  const { email, password } = validationResult.data as LoginInput
  const userWithSalt = await UserRepository.login({ email, password })
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
  const {
    newKeySalt,
    verificationBlob,
    recoveryBlob,
    reEncryptedKeys,
  } = req.body

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
