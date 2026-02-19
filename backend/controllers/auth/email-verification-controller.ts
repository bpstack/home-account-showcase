// controllers/auth/email-verification-controller.ts

import { Request, Response } from 'express'
import * as crypto from 'crypto'
import emailjs from '@emailjs/nodejs'
import { UserRepository } from '../../repositories/auth/user-repository.js'
import { sendVerificationEmail } from '../../services/email/email-service.js'
import { AppError } from '../../utils/app-error.js'
import { logger } from '../../utils/logger.js'

const TOKEN_EXPIRY_HOURS = 24
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const { token, email } = req.query

  if (!token || !email || typeof token !== 'string' || typeof email !== 'string') {
    throw new AppError('Token y email son requeridos', 400)
  }

  if (!email.includes('@')) {
    throw new AppError('Formato de email inválido', 400)
  }

  const user = await UserRepository.verifyEmailToken(token, email)

  if (!user) {
    res.status(200).json({
      success: true,
      verified: false,
      message: 'El enlace es inválido o ha expirado. Por favor, solicita uno nuevo.',
    })
    return
  }

  if (user.email.toLowerCase() !== email.toLowerCase()) {
    logger.warn('EMAIL_VERIFY', 'verifyEmail', 'Email mismatch', {
      tokenEmail: email,
      userEmail: user.email,
    })
    res.status(200).json({
      success: true,
      verified: false,
      message: 'El enlace es inválido. Por favor, solicita uno nuevo.',
    })
    return
  }

  await UserRepository.markEmailAsVerified(user.id)

  logger.info('EMAIL_VERIFY', 'verifyEmail', 'Email verified successfully', {
    userId: user.id,
    email: user.email,
  })

  res.status(200).json({
    success: true,
    verified: true,
    message: 'Email verificado correctamente. Ya puedes iniciar sesión.',
  })
}

export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body

  if (!email || typeof email !== 'string') {
    throw new AppError('Email es requerido', 400)
  }

  const normalizedEmail = email.toLowerCase().trim()

  const user = await UserRepository.findByEmail(normalizedEmail)

  if (!user) {
    logger.info('EMAIL_VERIFY', 'resendVerification', 'Email not found (silent)', {
      email: normalizedEmail,
    })
    res.status(200).json({
      success: true,
      message: 'Si el email está registrado, recibirás instrucciones de verificación.',
    })
    return
  }

  if (user.email_verified) {
    res.status(200).json({
      success: true,
      message: 'Este email ya está verificado. Puedes iniciar sesión directamente.',
      alreadyVerified: true,
    })
    return
  }

  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await UserRepository.setVerificationToken(user.id, token, expiresAt)

  const verificationLink = `${FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`

  const emailSent = await sendVerificationEmail({
    toEmail: normalizedEmail,
    toName: user.name,
    verificationLink,
  })

  if (!emailSent) {
    logger.error(
      'EMAIL_VERIFY',
      'resendVerification',
      'Failed to send email',
      new Error('EmailJS failed'),
      { userId: user.id }
    )
    throw new AppError('Error al enviar el email. Intenta de nuevo más tarde.', 500)
  }

  logger.info('EMAIL_VERIFY', 'resendVerification', 'Verification email sent', {
    userId: user.id,
    email: normalizedEmail,
  })

  res.status(200).json({
    success: true,
    message: 'Email de verificación enviado. Revisa tu bandeja de entrada y spam.',
  })
}

/**
 * POST /api/auth/complete-crypto-setup
 * Body: { email, verificationBlob, encryptedAccountKey, accountId }
 *
 * Completes encryption setup for users who haven't verified their email yet.
 * This is PUBLIC (no auth required) but only works for unverified users.
 * Security: Only allows setup once (cannot overwrite existing data).
 */
export const completeCryptoSetup = async (req: Request, res: Response): Promise<void> => {
  const { email, verificationBlob, encryptedAccountKey, accountId } = req.body

  if (!email || typeof email !== 'string') {
    throw new AppError('Email es requerido', 400)
  }

  if (!verificationBlob || typeof verificationBlob !== 'string') {
    throw new AppError('verificationBlob es requerido', 400)
  }

  const normalizedEmail = email.toLowerCase().trim()
  const user = await UserRepository.findByEmail(normalizedEmail)

  if (!user) {
    // Don't reveal if user exists
    res.status(200).json({ success: true })
    return
  }

  // Security: Only allow for unverified users
  if (user.email_verified) {
    throw new AppError('Setup already completed', 400)
  }

  // Save verification blob
  await UserRepository.saveVerificationBlob(user.id, verificationBlob)

  // Save encrypted account key if provided
  if (encryptedAccountKey && accountId) {
    await UserRepository.saveAccountKeyForSetup(user.id, accountId, encryptedAccountKey)
  }

  logger.info('EMAIL_VERIFY', 'completeCryptoSetup', 'Crypto setup completed', {
    userId: user.id,
    email: normalizedEmail,
  })

  res.status(200).json({ success: true })
}

export async function sendVerificationTokenEmail(
  userId: string,
  email: string,
  name: string
): Promise<boolean> {
  const token = generateVerificationToken()
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await UserRepository.setVerificationToken(userId, token, expiresAt)

  const verificationLink = `${FRONTEND_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`

  const sent = await sendVerificationEmail({
    toEmail: email,
    toName: name,
    verificationLink,
  })

  if (sent) {
    logger.info('EMAIL', 'sendVerificationTokenEmail', 'Email sent', { userId, email })
  } else {
    logger.error(
      'EMAIL',
      'sendVerificationTokenEmail',
      'Failed to send',
      new Error('EmailJS failed'),
      { userId, email }
    )
  }

  return sent
}

// ============================================
// EMAIL CHANGE
// ============================================

const EMAIL_CHANGE_TOKEN_EXPIRY_HOURS = 1

/**
 * POST /api/auth/change-email
 * Body: { newEmail: string }
 * Requiere autenticación
 */
export const requestEmailChange = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id
  const { newEmail } = req.body

  if (!newEmail || typeof newEmail !== 'string') {
    throw new AppError('Nuevo email requerido', 400)
  }

  const normalizedEmail = newEmail.toLowerCase().trim()

  // Validate format
  if (!normalizedEmail.includes('@') || normalizedEmail.length < 5) {
    throw new AppError('Formato de email inválido', 400)
  }

  // Get current user
  const currentUser = await UserRepository.getById(userId)
  if (!currentUser) {
    throw new AppError('Usuario no encontrado', 404)
  }

  // Check if same email
  if (currentUser.email.toLowerCase() === normalizedEmail) {
    throw new AppError('El nuevo email debe ser diferente al actual', 400)
  }

  // Generate token and save pending change
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  const success = await UserRepository.initiateEmailChange(
    userId,
    normalizedEmail,
    token,
    expiresAt
  )

  if (!success) {
    throw new AppError('Este email ya está en uso', 409)
  }

  // Send verification to NEW email
  const confirmLink = `${FRONTEND_URL}/confirm-email-change?token=${token}`

  const emailSent = await sendEmailChangeVerification({
    toEmail: normalizedEmail,
    toName: currentUser.name,
    confirmLink,
    oldEmail: currentUser.email,
  })

  if (!emailSent) {
    // Rollback the pending change since email failed
    await UserRepository.cancelEmailChange(userId)
    throw new AppError('Error al enviar el email de verificación. Intenta de nuevo.', 500)
  }

  logger.info('EMAIL_CHANGE', 'requestEmailChange', 'Verification email sent', {
    userId,
    newEmail: normalizedEmail,
  })

  res.status(200).json({
    success: true,
    message: 'Se ha enviado un email de verificación a tu nuevo correo.',
  })
}

/**
 * GET /api/auth/confirm-email-change?token=xxx
 * Public endpoint to confirm email change
 */
export const confirmEmailChange = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query

  if (!token || typeof token !== 'string') {
    throw new AppError('Token requerido', 400)
  }

  const result = await UserRepository.completeEmailChange(token)

  if (!result) {
    res.status(200).json({
      success: true,
      changed: false,
      message: 'El enlace es inválido o ha expirado. Solicita un nuevo cambio desde la aplicación.',
    })
    return
  }

  logger.info('EMAIL_CHANGE', 'confirmEmailChange', 'Email changed successfully', {
    userId: result.userId,
    oldEmail: result.oldEmail,
    newEmail: result.newEmail,
  })

  res.status(200).json({
    success: true,
    changed: true,
    message: 'Email cambiado correctamente. Debes verificar tu nuevo email.',
  })
}

/**
 * POST /api/auth/cancel-email-change
 * Body: {}
 * Requires authentication
 */
export const cancelEmailChange = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id

  await UserRepository.cancelEmailChange(userId)

  logger.info('EMAIL_CHANGE', 'cancelEmailChange', 'Email change cancelled', { userId })

  res.status(200).json({
    success: true,
    message: 'Cambio de email cancelado.',
  })
}

/**
 * Send email change verification email
 */
async function sendEmailChangeVerification({
  toEmail,
  toName,
  confirmLink,
  oldEmail,
}: {
  toEmail: string
  toName: string
  confirmLink: string
  oldEmail: string
}): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID_V2
  const templateId = process.env.EMAILJS_TEMPLATE_ID_V3
  const publicKey = process.env.EMAILJS_PUBLIC_KEY_V2
  const privateKey = process.env.EMAILJS_PRIVATE_KEY_V2

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    logger.error(
      'EMAIL',
      'sendEmailChangeVerification',
      `Missing EmailJS env vars: serviceId=${!!serviceId}, templateId=${!!templateId}, publicKey=${!!publicKey}, privateKey=${!!privateKey}`,
      new Error('Missing env vars')
    )
    return false
  }

  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: toEmail,
        name: toName || 'Usuario',
        link: confirmLink,
        old_email: oldEmail,
        title: toEmail, // For subject: "Confirma el cambio de email: {{title}}"
      },
      {
        publicKey,
        privateKey,
      }
    )

    logger.info(
      'EMAIL',
      'sendEmailChangeVerification',
      `Email sent: ${response.status} ${response.text}`
    )
    return true
  } catch (error) {
    logger.error('EMAIL', 'sendEmailChangeVerification', 'Failed to send email', error as Error)
    return false
  }
}
