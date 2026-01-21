// services/ai/prompts/profile-prompt.ts
// Prompt para analizar el perfil de riesgo del usuario

import type { ProfileAnswers, InvestmentContext, MarketDataContext } from './types.js'

interface ProfileAssessmentResult {
  recommendedProfile: 'conservative' | 'balanced' | 'dynamic'
  confidence: number
  reasoning: string
  investmentPercentage: number
  monthlyInvestable: number
  liquidityReserve: number
  historicalInsights: {
    monthsAnalyzed: number
    trend: string
    bestMonth: string
    worstMonth: string
  }
  warnings: string[]
}

export function buildProfileAssessmentPrompt(
  answers: ProfileAnswers,
  context: InvestmentContext,
  marketData: MarketDataContext
): string {
  return `Eres un asesor financiero educativo basado en datos reales de la cuenta del usuario.

# CONTEXTO FINANCIERO REAL DEL USUARIO
El análisis se basa en **${context.historicalMonths} meses de transacciones históricas**:

**Métricas financieras:**
- Ingreso mensual promedio: ${context.avgMonthlyIncome}€
- Gastos mensuales promedio: ${context.avgMonthlyExpenses}€
- Capacidad de ahorro mensual: ${context.savingsCapacity}€ (${context.savingsRate}%)
- Tendencia de ahorro: ${context.trend} (${context.deficitMonths} meses con déficit)
- Fondo de emergencia actual: ${context.emergencyFundCurrent}€
- Objetivo mínimo recomendado (6 meses gastos): ${context.emergencyFundGoal}€

**PRECIOS ACTUALES DE MERCADO:**
- S&P 500: ${marketData.sp500.value.toLocaleString()} (${marketData.sp500.change24h >= 0 ? '+' : ''}${marketData.sp500.change24h.toFixed(2)}%)
- MSCI World: ${marketData.msciWorld.value.toLocaleString()} (${marketData.msciWorld.change24h >= 0 ? '+' : ''}${marketData.msciWorld.change24h.toFixed(2)}%)
- Bitcoin: ${marketData.btc.value.toLocaleString()}€ (${marketData.btc.change24h >= 0 ? '+' : ''}${marketData.btc.change24h.toFixed(2)}%)
- Ethereum: ${marketData.eth.value.toLocaleString()}€ (${marketData.eth.change24h >= 0 ? '+' : ''}${marketData.eth.change24h.toFixed(2)}%)
- EUR/USD: ${marketData.eurUsd}

**DISTRIBUCIÓN DE GASTOS POR CATEGORÍA:**
${Object.entries(context.transactionCategories)
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .slice(0, 8)
  .map(([cat, amount]) => `- ${cat}: ${amount}%`)
  .join('\n')}

# RESPUESTAS DEL CUESTIONARIO
${JSON.stringify({
  edad: answers.age,
  ingresosMensuales: answers.monthlyIncome,
  estabilidadLaboral: answers.jobStability,
  tieneFondoEmergencia: answers.hasEmergencyFund,
  horizonteTemporal: answers.horizonYears,
  reaccionCaida20: answers.reactionToDrop,
  experienciaInversion: answers.experienceLevel
}, null, 2)}

# INSTRUCCIONES

1. **Analiza las respuestas Y los datos reales** de ${context.historicalMonths} meses de transacciones
2. **Compara el comportamiento declarado** con los patrones reales de gasto/ahorro
3. **Determina el perfil de riesgo** más apropiado considerando:
   - Si el usuario declara ser "conservador" pero históricamente gasta más de lo que gana → warning
   - Si declara "dinámico" pero no tiene fondo de emergencia → ajustar a equilibrado
   - La capacidad de ahorro real vs declarada
4. **Justifica tu recomendación** comparando respuestas con comportamiento real
5. **Calcula el % del ahorro** que debería destinarse a inversión según el perfil
6. **Considera el contexto de mercados actuales** (mercados en máximos = más cautela)

# REGLAS DE PERFIL

| Perfil | Capacidad Ahorro | Horizonte | Reacción Caída | Inversión % Ahorro |
|--------|------------------|-----------|----------------|-------------------|
| **Conservador** | < 15% | < 3 años | Vender | 5-10% |
| **Equilibrado** | 15-25% | 3-10 años | Mantener | 15-30% |
| **Dinámico** | > 25% | > 10 años | Comprar más | 30-45% |

# IMPORTANTE

- Si tiene fondo de emergencia incompleto (< 3 meses), reducir inversión %
- Si tiene muchos meses en déficit, warning importante
- Si mercados están muy altos (S&P 500 > 5000), sugerir más cautela
- Incluir insights del historial real (mejor/peor mes)

Responde **EXCLUSIVAMENTE** con JSON válido:

\`\`\`json
{
  "recommendedProfile": "conservative" | "balanced" | "dynamic",
  "confidence": 0.0-1.0,
  "reasoning": "Explicación detallada comparando respuestas con datos reales. Mínimo 150 caracteres.",
  "investmentPercentage": 5-45,
  "monthlyInvestable": número,
  "liquidityReserve": número,
  "historicalInsights": {
    "monthsAnalyzed": número,
    "trend": "improving" | "stable" | "declining",
    "bestMonth": "nombre del mes",
    "worstMonth": "nombre del mes",
    "savingsConsistency": "alta" | "media" | "baja"
  },
  "warnings": ["aviso importante 1", "aviso importante 2"],
  "marketContext": "Comentario breve sobre situación actual de mercados"
}
\`\`\`

No incluyas markdown, solo el JSON puro.`
}

export function parseProfileAssessmentResponse(text: string): ProfileAssessmentResult {
  try {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    return JSON.parse(cleaned) as ProfileAssessmentResult
  } catch (error) {
    console.error('[ProfilePrompt] Error parsing response:', error)
    throw new Error('No se pudo parsear la respuesta del perfil')
  }
}

// Types
export interface ProfileAnswers {
  age: number
  monthlyIncome: number
  jobStability: 'high' | 'medium' | 'low'
  hasEmergencyFund: 'yes' | 'partial' | 'no'
  horizonYears: '<3' | '3-10' | '>10'
  reactionToDrop: 'sell' | 'hold' | 'buy_more'
  experienceLevel: 'none' | 'basic' | 'intermediate' | 'advanced'
}

export * from './types.js'
