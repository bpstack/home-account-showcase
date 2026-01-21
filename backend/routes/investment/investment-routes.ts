// routes/investment/investment-routes.ts
// Rutas del módulo de inversión

import { Router } from 'express'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
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
  explainConcept
} from '../../controllers/investment/investment-controller.js'

const router = Router()

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
router.patch('/:accountId/liquidity-reserve', async (req, res) => {
  const { updateLiquidityReserve } = await import('../../controllers/investment/investment-controller.js')
  updateLiquidityReserve(req, res)
})

// POST /api/investment/:accountId/analyze-profile
router.post('/:accountId/analyze-profile', analyzeProfile)

// POST /api/investment/:accountId/recommendations
router.post('/:accountId/recommendations', getRecommendations)

// GET /api/investment/:accountId/market-prices
router.get('/:accountId/market-prices', getMarketPrices)

// ========================
// Chat endpoints
// ========================

// GET /api/investment/:accountId/chat/sessions
router.get('/:accountId/chat/sessions', getChatSessions)

// POST /api/investment/:accountId/chat/session
router.post('/:accountId/chat/session', createChatSession)

// POST /api/investment/:accountId/chat/:sessionId/message
router.post('/:accountId/chat/:sessionId/message', sendChatMessage)

// GET /api/investment/:accountId/chat/:sessionId/history
router.get('/:accountId/chat/:sessionId/history', getChatHistory)

// DELETE /api/investment/:accountId/chat/:sessionId
router.delete('/:accountId/chat/:sessionId', deleteChatSession)

// ========================
// Education endpoint
// ========================

// GET /api/investment/:accountId/education?q=...
router.get('/:accountId/education', explainConcept)

export default router
