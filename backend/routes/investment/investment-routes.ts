// routes/investment/investment-routes.ts
// Rutas del módulo de inversión

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { aiRateLimiter } from '../../middlewares/aiRateLimiter.js'
import { marketRateLimiter } from '../../middlewares/rateLimiter.js'
import {
  getOverview,
  analyzeProfile,
  updateEmergencyFundMonths,
  getRecommendations,
  getMarketPrices,
  createChatSession,
  sendChatMessage,
  getChatHistory,
  getChatSessions,
  deleteChatSession,
  explainConcept,
  updateLiquidityReserve,
} from '../../controllers/investment/investment-controller.js'

const router: Router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// ========================
// Investment endpoints
// ========================

// GET /api/investment/:accountId/overview
router.get('/:accountId/overview', getOverview)

// PATCH /api/investment/:accountId/emergency-fund-months
router.patch('/:accountId/emergency-fund-months', updateEmergencyFundMonths)

// PATCH /api/investment/:accountId/liquidity-reserve
router.patch('/:accountId/liquidity-reserve', updateLiquidityReserve)

// POST /api/investment/:accountId/analyze-profile (uses AI - 1 request)
router.post('/:accountId/analyze-profile', aiRateLimiter(), analyzeProfile)

// POST /api/investment/:accountId/recommendations (uses AI - 1 request)
router.post('/:accountId/recommendations', aiRateLimiter(), getRecommendations)

// GET /api/investment/:accountId/market-prices
router.get('/:accountId/market-prices', marketRateLimiter, getMarketPrices)

// ========================
// Chat endpoints
// ========================

// GET /api/investment/:accountId/chat/sessions
router.get('/:accountId/chat/sessions', getChatSessions)

// POST /api/investment/:accountId/chat/session
router.post('/:accountId/chat/session', createChatSession)

// POST /api/investment/:accountId/chat/:sessionId/message (uses AI - 1 request per message)
router.post('/:accountId/chat/:sessionId/message', aiRateLimiter(), sendChatMessage)

// GET /api/investment/:accountId/chat/:sessionId/history
router.get('/:accountId/chat/:sessionId/history', getChatHistory)

// DELETE /api/investment/:accountId/chat/:sessionId
router.delete('/:accountId/chat/:sessionId', deleteChatSession)

// ========================
// Education endpoint
// ========================

// GET /api/investment/:accountId/education?q=... (uses AI - 1 request)
router.get('/:accountId/education', aiRateLimiter(), explainConcept)

export default router
