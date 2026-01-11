// controllers/ai/ai-controller.ts

import { Request, Response } from 'express'
import { getAIStatus, testProviderConnection, createAIClient, isAIEnabled, setActiveProvider, getActiveProvider } from '../../services/ai/ai-client.js'
import type { AIProviderType, ParsedTransactionAI } from '../../services/ai/types.js'

/**
 * Get AI status and available providers
 * GET /api/ai/status
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = getAIStatus()

    res.status(200).json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error('Error en getStatus:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Set active AI provider
 * PUT /api/ai/provider
 * Body: { provider: "claude" | "gemini" | "groq" | "ollama" | "none" }
 */
export const setProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.body as { provider: AIProviderType }

    if (!provider) {
      res.status(400).json({
        success: false,
        error: 'provider es requerido',
      })
      return
    }

    const validProviders: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama', 'none']
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        success: false,
        error: `Provider inválido. Válidos: ${validProviders.join(', ')}`,
      })
      return
    }

    setActiveProvider(provider)

    res.status(200).json({
      success: true,
      activeProvider: getActiveProvider(),
    })
  } catch (error) {
    console.error('Error en setProvider:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Test connection to a specific provider
 * POST /api/ai/test
 * Body: { provider: "claude" | "gemini" | "groq" | "ollama" }
 */
export const testConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.body as { provider: AIProviderType }

    if (!provider) {
      res.status(400).json({
        success: false,
        error: 'provider es requerido',
      })
      return
    }

    const validProviders: AIProviderType[] = ['claude', 'gemini', 'groq', 'ollama']
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        success: false,
        error: `Provider inválido. Válidos: ${validProviders.join(', ')}`,
      })
      return
    }

    const result = await testProviderConnection(provider)

    res.status(result.success ? 200 : 400).json(result)
  } catch (error) {
    console.error('Error en testConnection:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * Parse transactions from text using AI
 * POST /api/ai/parse
 * Body: { text: string, provider?: AIProviderType }
 */
export const parseTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, provider } = req.body as { text: string; provider?: AIProviderType }

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'text es requerido',
      })
      return
    }

    if (!isAIEnabled()) {
      res.status(400).json({
        success: false,
        error: 'AI está deshabilitada (AI_ENABLED=false)',
      })
      return
    }

    const client = createAIClient(provider)
    if (!client.isAvailable()) {
      res.status(400).json({
        success: false,
        error: 'No hay proveedor de IA disponible',
      })
      return
    }

    const startTime = Date.now()

    const prompt = buildTransactionParsingPrompt(text)
    const response = await client.sendPromptJSON<{ transactions: ParsedTransactionAI[] }>(prompt)

    const responseTime = Date.now() - startTime

    console.log(`[AI:${client.getProviderName()}] Parsed ${response.transactions?.length || 0} transactions in ${responseTime}ms`)

    res.status(200).json({
      success: true,
      transactions: response.transactions || [],
      provider: client.getProviderName(),
      responseTime,
    })
  } catch (error) {
    console.error('Error en parseTransactions:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor',
    })
  }
}

/**
 * Build the prompt for parsing transactions
 */
function buildTransactionParsingPrompt(text: string): string {
  return `Eres un asistente especializado en extraer transacciones financieras de texto.

Analiza el siguiente texto y extrae TODAS las transacciones que encuentres.
Devuelve un JSON con el siguiente formato:

{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descripción del movimiento",
      "amount": -50.00,
      "category": "categoría si la hay",
      "subcategory": "subcategoría si la hay"
    }
  ]
}

REGLAS:
- Importes negativos para gastos, positivos para ingresos
- Fechas en formato ISO (YYYY-MM-DD)
- Si no hay fecha clara, usar null
- Si no hay categoría, dejar vacío
- Devuelve SOLO el JSON, sin explicaciones
- Si el texto contiene números con coma como separador decimal (ej: 50,00), conviértelos a punto (50.00)
- Si hay símbolos de moneda (€, $), ignóralos en el amount

TEXTO A ANALIZAR:
---
${text}
---`
}
