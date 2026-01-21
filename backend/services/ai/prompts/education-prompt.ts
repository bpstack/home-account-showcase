// services/ai/prompts/education-prompt.ts
// Prompt para explicar conceptos financieros educativos

import type { EducationResult } from './types.js'

const FINANCIAL_CONCEPTS: Record<string, string> = {
  'ETF': 'Fondo que cotiza en bolsa como una acción, pero que contiene múltiples activos. Ejemplo: IWDA contiene acciones de todo el mundo.',
  'INDEXADO': 'Estrategia de inversión que replica un índice bursátil (S&P 500, MSCI World) en lugar de intentar superarlo.',
  'DIVERSIFICACION': 'Estrategia de distribuir inversiones en diferentes activos para reducir riesgo. "No poner todos los huevos en una misma cesta".',
  'COMPOUND': 'El interés compuesto es el interés sobre el interés. Hace que tu dinero crezca exponencialmente con el tiempo.',
  'VOLATILIDAD': 'Medida de cuánto fluctúa el precio de un activo. Alta volatilidad = cambios de precio grandes y rápidos.',
  'CORRECCION': 'Caída del 10% o más desde máximos históricos. Es normal y esperada en mercados.',
  'RESACA': 'Caída fuerte tras un período de euforia. Puede ser del 20% o más.',
  'ACCION': 'Participación en una empresa. Cuando compras acciones, eres propietario parcial de esa empresa.',
  'BONO': 'Préstamo a una empresa o gobierno. A cambio recibes intereses periódicos.',
  'FONDO': 'Vehículo que agrupa dinero de muchos inversores para comprar múltiples activos.',
  'CRIPTO': 'Moneda digital descentralizada. Muy volátil, alto riesgo.',
  'REBALANCEO': 'Ajuste periódico de tu cartera para mantener la distribución deseada de activos.',
  'COSTE_MEDIO': 'Invertir cantidades regulares sin importar el precio, así reduces el impacto de la volatilidad.',
  'LIQUIDEZ': 'Facilidad para convertir un activo en efectivo sin perder valor.',
  'EXPENSE_RATIO': 'Comisión anual que cobra un fondo por gestionar tu dinero.',
  'CAPITALIZACION': 'Valor total de una empresa en bolsa. Grandes caps = empresas establecidas.',
  'DOW_JONES': 'Índice de 30 empresas grandes de EE.UU. Uno de los más antiguos.',
  'SP500': 'Índice con las 500 empresas más grandes de EE.UU. Representa ~80% del mercado estadounidense.',
  'NASDAQ': 'Índice con muchas empresas tecnológicas. Incluye las mayores tech companies.',
  'MSCI_WORLD': 'Índice global con empresas de países desarrollados de todo el mundo.'
}

export function buildEducationPrompt(
  concept: string,
  userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  marketData?: {
    sp500?: number
    btc?: number
    eurUsd?: number
  }
): string {
  const baseConcept = Object.keys(FINANCIAL_CONCEPTS)
    .find(key => concept.toLowerCase().includes(key.toLowerCase()))

  const conceptExplanation = baseConcept 
    ? FINANCIAL_CONCEPTS[baseConcept] 
    : ''

  const levelInstructions = {
    beginner: 'Usa ejemplos cotidianos, evita jerga técnica, explica como a un niño de 12 años.',
    intermediate: 'Puedes usar términos técnicos pero defínelos. Incluye ejemplos prácticos.',
    advanced: 'Asume conocimiento financiero básico. Usa terminología precisa.'
  }

  let marketContext = ''
  if (marketData) {
    marketContext = `
# CONTEXTO ACTUAL DE MERCADO
${marketData.sp500 ? `- S&P 500 actual: ${marketData.sp500.toLocaleString()}` : ''}
${marketData.btc ? `- Bitcoin actual: ${marketData.btc.toLocaleString()}€` : ''}
${marketData.eurUsd ? `- EUR/USD: ${marketData.eurUsd}` : ''}
`
  }

  return `Eres un profesor de finanzas personales. Explica el siguiente concepto financiero de forma clara y educativa.

# CONCEPTO A EXPLICAR
${concept}

${conceptExplanation ? `EXPLICACIÓN BREVE:
${conceptExplanation}` : ''}

${marketContext}

# NIVEL DEL USUARIO
${userLevel.toUpperCase()}
${levelInstructions[userLevel]}

# INSTRUCCIONES

1. **Explica el concepto** de forma clara y progresiva
2. **Usa analogías** de la vida real si es posible
3. **Da ejemplos prácticos** numéricos cuando ayude a entender
4. **Muestra las implicaciones** prácticas para sus finanzas
5. **Advierte sobre riesgos** si el concepto los tiene
6. **Sugiere temas relacionados** para aprender más

# ESTRUCTURA DE RESPUESTA

- Una frase inicial que defina el concepto
- Explicación progresiva (de simple a complejo)
- Ejemplo numérico concreto (si aplica)
- Riesgos o consideraciones importantes
- Tema relacionado para profundizar

Responde **EXCLUSIVAMENTE** con JSON válido:

\`\`\`json
{
  "concept": "Nombre del concepto",
  "summary": "Definición en una frase",
  "explanation": "Explicación detallada en 2-3 párrafos",
  "example": "Ejemplo práctico numérico o histórico",
  "risks": ["riesgo1", "riesgo2"] | [],
  "relatedConcepts": ["concepto1", "concepto2"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "timeToUnderstand": "aproximadamente cuánto tiempo para entenderlo"
}
\`\`\`

No incluyas markdown, solo JSON puro.`
}

export function buildQuickEducationPrompt(
  question: string,
  marketData?: { sp500?: number; btc?: number }
): string {
  return `Explica esto brevemente:

"${question}"

${marketData?.sp500 ? `Contexto: S&P 500 está en ${marketData.sp500.toLocaleString()}` : ''}

Máximo 80 palabras. JSON:
{"answer": "...", "relatedConcept": "tema relacionado"}`
}

export function parseEducationResponse(text: string): EducationResult {
  try {
    const cleaned = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    
    return JSON.parse(cleaned) as EducationResult
  } catch (error) {
    console.error('[EducationPrompt] Error parsing response:', error)
    return {
      concept: 'Error',
      summary: 'No se pudo procesar la explicación',
      explanation: 'Lo siento, tuve un problema explicando este concepto.',
      example: '',
      risks: [],
      relatedConcepts: [],
      difficulty: 'beginner',
      timeToUnderstand: 'N/A'
    }
  }
}

export function getConceptKeywords(): string[] {
  return Object.keys(FINANCIAL_CONCEPTS)
}

export function findMatchingConcept(query: string): string | null {
  const lower = query.toLowerCase()
  return Object.keys(FINANCIAL_CONCEPTS)
    .find(key => lower.includes(key.toLowerCase())) || null
}
