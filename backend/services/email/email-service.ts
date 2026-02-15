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
    logger.error('EMAIL', 'sendPasswordResetEmail', 'Missing EmailJS env vars', 'Check EMAILJS_* in .env')
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

    logger.info('EMAIL', 'sendPasswordResetEmail', `Email sent: ${response.status} ${response.text}`)
    return true
  } catch (error) {
    logger.error('EMAIL', 'sendPasswordResetEmail', 'Failed to send email', String(error))
    return false
  }
}
