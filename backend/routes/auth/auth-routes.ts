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
  saveVerificationBlob,
  saveRecoveryBlob,
  getRecoveryInfo,
  recoverWithBip39,
  recordFailedBip39,
  recordFailedPin,
  resetPinAttempts,
} from '../../controllers/auth/auth-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { checkCSRF } from '../../middlewares/csrfMiddleware.js'
import { loginRateLimiter, registerRateLimiter } from '../../middlewares/rateLimiter.js'

const router: Router = Router()

// Rutas públicas
router.post('/register', registerRateLimiter, register) // Rate limiting en registro
router.post('/login', loginRateLimiter, login) // Rate limiting en login
router.post('/refresh', refresh)

// Rutas protegidas
router.get('/me', authenticateToken, me)
router.get('/keys', authenticateToken, getKeys)
router.post('/change-password', authenticateToken, checkCSRF, changePassword)
router.post('/change-pin', authenticateToken, checkCSRF, changePin)
router.post('/verification-blob', authenticateToken, checkCSRF, saveVerificationBlob)
router.post('/logout', authenticateToken, checkCSRF, logout)

// Recovery routes (authenticated but crypto may be locked)
router.get('/recovery-info', authenticateToken, getRecoveryInfo)
router.post('/recovery-blob', authenticateToken, checkCSRF, saveRecoveryBlob)
router.post('/recover-bip39', authenticateToken, checkCSRF, recoverWithBip39)
router.post('/record-failed-bip39', authenticateToken, checkCSRF, recordFailedBip39)
router.post('/record-failed-pin', authenticateToken, checkCSRF, recordFailedPin)
router.post('/reset-pin-attempts', authenticateToken, checkCSRF, resetPinAttempts)

export default router
