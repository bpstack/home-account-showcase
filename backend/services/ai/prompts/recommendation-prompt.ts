// services/ai/prompts/recommendation-prompt.ts
// Prompt para generar recomendaciones de inversión personalizadas

import type { RecommendationResult, InvestmentContext, MarketDataContext } from './types.js'

// Interface definitions removed to use shared types from ./types.js

export function buildRecommendationPrompt(
  profile: 'conservative' | 'balanced' | 'dynamic',
  monthlyAmount: number,
  context: InvestmentContext,
  marketData: MarketDataContext
): string {
  const allocationRules = {
    conservative: { stocks: 30, bonds: 50, crypto: 5, cash: 15 },
    balanced: { stocks: 55, bonds: 30, crypto: 5, cash: 10 },
    dynamic: { stocks: 70, bonds: 15, crypto: 10, cash: 5 }
  }

  const allocation = allocationRules[profile]

  return `Eres un asesor financiero educativo. Genera recomendaciones de inversión personalizadas basadas en el perfil y datos reales.

# PERFIL DEL USUARIO
- Perfil de riesgo: ${profile.toUpperCase()}
- Horizonte temporal: ${context.horizonYears || 5} años
- Experiencia: ${context.experienceLevel || 'basic'}
- Porcentaje del ahorro a invertir: ${context.investmentPercentage || 20}%

# CONTEXTO FINANCIERO REAL
- Capacidad de ahorro mensual: ${context.savingsCapacity}€
- **Monto mensual a invertir: ${monthlyAmount}€**
- Fondo de emergencia: ${context.emergencyFundCurrent}€ / ${context.emergencyFundGoal}€ objetivo

# PRECIOS ACTUALES DE MERCADO
| Activo | Precio | Cambio 24h |
|--------|--------|------------|
| S&P 500 | ${marketData.sp500.value.toLocaleString()} | ${marketData.sp500.change24h >= 0 ? '+' : ''}${marketData.sp500.change24h.toFixed(2)}% |
| MSCI World | ${marketData.msciWorld.value.toLocaleString()} | ${marketData.msciWorld.change24h >= 0 ? '+' : ''}${marketData.msciWorld.change24h.toFixed(2)}% |
| Bitcoin | ${marketData.btc.value.toLocaleString()}€ | ${marketData.btc.change24h >= 0 ? '+' : ''}${marketData.btc.change24h.toFixed(2)}% |
| Ethereum | ${marketData.eth.value.toLocaleString()}€ | ${marketData.eth.change24h >= 0 ? '+' : ''}${marketData.eth.change24h.toFixed(2)}% |
| EUR/USD | ${marketData.eurUsd} | - |

# DISTRIBUCIÓN RECOMENDADA (${profile.toUpperCase()})
| Activo | Porcentaje | Monto Mensual |
|--------|------------|---------------|
| Acciones/ETFs | ${allocation.stocks}% | ${(monthlyAmount * allocation.stocks / 100).toFixed(2)}€ |
| Renta Fija | ${allocation.bonds}% | ${(monthlyAmount * allocation.bonds / 100).toFixed(2)}€ |
| Cripto | ${allocation.crypto}% | ${(monthlyAmount * allocation.crypto / 100).toFixed(2)}€ |
| Liquidez | ${allocation.cash}% | ${(monthlyAmount * allocation.cash / 100).toFixed(2)}€ |

# INSTRUCCIONES

1. Genera **3-5 recomendaciones específicas** de productos de inversión
2. Para cada recomendación incluye:
   - Tipo (ETF, fondo, crypto, etc.)
   - Nombre/símbolo identificativo
   - Porcentaje del monto mensual
   - Importe en €
   - Razón breve pero fundamentada
   - Nivel de riesgo (low/medium/high)

3. **Productos sugeridos** (basados en precios actuales):
   - ETFs: IWDA (MSCI World), SPY (S&P 500), QQQ (NASDAQ)
   - Cripto: BTC, ETH (máximo ${allocation.crypto}% del total)
   - Fondos: bonos europeos, fondos monetarios

4. **Consideraciones especiales**:
   - Si mercados están muy arriba, sugerir más peso en renta fija
   - Si perfil es conservador, evitar crypto o muy poco %
   - Incluir siempre alguna opción de liquidez

5. **NO proporcionales recomendaciones de compra/venta específicas**, solo distribución teórica

Responde **EXCLUSIVAMENTE** con JSON válido:

\`\`\`json
{
  "recommendations": [
    {
      "type": "ETF" | "BOND_FUND" | "CRYPTO" | "STOCK" | "SAVINGS",
      "symbol": "Símbolo o nombre corto",
      "name": "Nombre del producto",
      "percentage": 10-100,
      "amount": número,
      "currentPrice": número,
      "units": número,
      "reason": "Razón breve (máx 80 caracteres)",
      "risk": "low" | "medium" | "high"
    }
  ],
  "totalMonthly": ${monthlyAmount},
  "assetAllocation": {
    "stocks": 0-100,
    "bonds": 0-100,
    "crypto": 0-100,
    "cash": 0-100
  },
  "marketContext": "Comentario sobre situación actual de mercados (máx 100 caracteres)",
  "disclaimer": "AVISO: Estas son recomendaciones genéricas basadas en распредел perfil. No constituyen asesoramiento financiero. Consulta un profesional."
}
\`\`\`

No incluyas markdown, solo JSON puro.`
}

export function parseRecommendationResponse(text: string): RecommendationResult {
  try {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    return JSON.parse(cleaned) as RecommendationResult
  } catch (error) {
    console.error('[RecommendationPrompt] Error parsing response:', error)
    throw new Error('No se pudo parsear las recomendaciones')
  }
}
