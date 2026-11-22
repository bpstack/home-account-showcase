// routes/auth/auth-routes.ts

import { Router } from 'express'
import {
  register,
  login,
  me,
  logout,
  refresh,
  getKeys,
  changePassword,
  changePin,
  unlock,
  setPin,
  saveVerificationBlob,
  saveRecoveryBlob,
  getRecoveryInfo,
  recoverWithBip39,
  recordFailedBip39,
  recordFailedPin,
  resetPinAttempts,
  forgotPassword,
  resetPassword,
  getResetInfo,
} from '../../controllers/auth/auth-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import {
  loginRateLimiter,
  pinRateLimiter,
  registerRateLimiter,
  passwordResetRateLimiter,
  verificationRateLimiter,
  changeEmailRateLimiter,
  emailRateLimiter,
  refreshRateLimiter,
} from '../../middlewares/rateLimiter.js'
import { readRefreshSession } from '../../middlewares/readRefreshSession.js'
import {
  verifyEmail,
  resendVerificationEmail,
  completeCryptoSetup,
  requestEmailChange,
  confirmEmailChange,
  cancelEmailChange,
} from '../../controllers/auth/email-verification-controller.js'

const router: Router = Router()

// Rutas públicas
router.post('/register', registerRateLimiter, emailRateLimiter, register) // Rate limiting en registro
router.post('/login', loginRateLimiter, login) // Rate limiting en login
// The refresh token is verified first, so the limiter counts per stored session
router.post('/refresh', readRefreshSession, refreshRateLimiter, refresh)

// Password reset routes (public)
router.post('/forgot-password', passwordResetRateLimiter, emailRateLimiter, forgotPassword)
router.get('/reset-info', passwordResetRateLimiter, getResetInfo)
router.post('/reset-password', passwordResetRateLimiter, emailRateLimiter, resetPassword)

// Email verification routes (public)
router.get('/verify-email', verifyEmail)
router.post(
  '/resend-verification',
  verificationRateLimiter,
  emailRateLimiter,
  resendVerificationEmail
)
router.post('/complete-crypto-setup', completeCryptoSetup)

// Email change routes (public - confirmation)
router.get('/confirm-email-change', confirmEmailChange)

// Rutas protegidas
router.get('/me', authenticateToken, me)
router.get('/keys', authenticateToken, getKeys)
router.post('/change-password', authenticateToken, checkCSRF, changePassword)
router.post('/unlock', authenticateToken, checkCSRF, pinRateLimiter, unlock)
router.post('/pin', authenticateToken, checkCSRF, pinRateLimiter, setPin)
router.post('/change-pin', authenticateToken, checkCSRF, changePin)
router.post('/verification-blob', authenticateToken, checkCSRF, saveVerificationBlob)
// Authorized by the refresh token cookie itself; works with an expired access token too
router.post('/logout', logout)

// Recovery routes (authenticated but crypto may be locked)
router.get('/recovery-info', authenticateToken, getRecoveryInfo)
router.post('/recovery-blob', authenticateToken, checkCSRF, saveRecoveryBlob)
router.post('/recover-bip39', authenticateToken, checkCSRF, recoverWithBip39)
router.post('/record-failed-bip39', authenticateToken, checkCSRF, recordFailedBip39)
router.post('/record-failed-pin', authenticateToken, checkCSRF, recordFailedPin)
router.post('/reset-pin-attempts', authenticateToken, checkCSRF, resetPinAttempts)

// Email change routes (authenticated)
// Authenticated first: the limiter counts per user
router.post(
  '/change-email',
  authenticateToken,
  checkCSRF,
  changeEmailRateLimiter,
  emailRateLimiter,
  requestEmailChange
)
router.post('/cancel-email-change', authenticateToken, checkCSRF, cancelEmailChange)

export default router
