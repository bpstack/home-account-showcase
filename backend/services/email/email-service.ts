/**
 * Email service using @emailjs/nodejs SDK (server-side)
 *
 * IMPORTANT: In EmailJS dashboard, go to Account → Security
 * and enable "Allow non-browser requests" for this to work.
 */

import emailjs from '@emailjs/nodejs'
import { logger } from '../../utils/logger.js'

interface SendResetEmailParams {
  toEmail: string
  toName: string
  resetLink: string
}

interface SendVerificationEmailParams {
  toEmail: string
  toName: string
  verificationLink: string
}

export async function sendPasswordResetEmail({
  toEmail,
  toName,
  resetLink,
}: SendResetEmailParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID
  const templateId = process.env.EMAILJS_TEMPLATE_ID
  const publicKey = process.env.EMAILJS_PUBLIC_KEY
  const privateKey = process.env.EMAILJS_PRIVATE_KEY

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    logger.error(
      'EMAIL',
      'sendPasswordResetEmail',
      'Missing EmailJS env vars',
      'Check EMAILJS_* in .env'
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
        link: resetLink,
      },
      {
        publicKey,
        privateKey,
      }
    )

    logger.info(
      'EMAIL',
      'sendPasswordResetEmail',
      `Email sent: ${response.status} ${response.text}`
    )
    return true
  } catch (error) {
    logger.error('EMAIL', 'sendPasswordResetEmail', 'Failed to send email', String(error))
    return false
  }
}

export async function sendVerificationEmail({
  toEmail,
  toName,
  verificationLink,
}: SendVerificationEmailParams): Promise<boolean> {
  const serviceId = process.env.EMAILJS_SERVICE_ID_V2
  const templateId = process.env.EMAILJS_TEMPLATE_ID_V2
  const publicKey = process.env.EMAILJS_PUBLIC_KEY_V2
  const privateKey = process.env.EMAILJS_PRIVATE_KEY_V2

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    logger.error(
      'EMAIL',
      'sendVerificationEmail',
      'Missing EmailJS V2 env vars',
      'Check EMAILJS_*_V2 in .env'
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
        link: verificationLink,
      },
      {
        publicKey,
        privateKey,
      }
    )

    logger.info('EMAIL', 'sendVerificationEmail', `Email sent: ${response.status} ${response.text}`)
    return true
  } catch (error) {
    logger.error('EMAIL', 'sendVerificationEmail', 'Failed to send email', String(error))
    return false
  }
}
