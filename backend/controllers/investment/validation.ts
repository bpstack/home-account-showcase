// controllers/investment/validation.ts
// Zod schemas for investment module validation

import { z } from 'zod'

export const FinancialMetricsSchema = z.object({
  avgMonthlyIncome: z.number().min(0),
  avgMonthlyExpenses: z.number().min(0),
  savingsCapacity: z.number(),
  savingsRate: z.number(),
  historicalMonths: z.number().int().min(0),
  trend: z.enum(['improving', 'stable', 'declining']),
  deficitMonths: z.number().int().min(0),
})

export const ProfileAnswersSchema = z.object({
  age: z
    .number({ error: 'La edad debe ser un número' })
    .int({ message: 'La edad debe ser un número entero' })
    .min(18, 'Debes tener al menos 18 años')
    .max(99, 'La edad máxima es 99 años'),
  monthlyIncome: z
    .number({ error: 'Los ingresos deben ser un número' })
    .int({ message: 'Los ingresos deben ser un número entero, sin decimales' })
    .positive('Los ingresos deben ser mayores a 0')
    .max(999999, 'Los ingresos no pueden superar 999.999€'),
  jobStability: z.enum(['high', 'medium', 'low'], { error: 'Selecciona una opción de estabilidad' }),
  hasEmergencyFund: z.enum(['yes', 'partial', 'no'], { error: 'Selecciona una opción' }),
  horizonYears: z.enum(['<3', '3-10', '>10'], { error: 'Selecciona un horizonte temporal' }),
  reactionToDrop: z.enum(['sell', 'hold', 'buy_more'], { error: 'Selecciona una reacción' }),
  experienceLevel: z.enum(['none', 'basic', 'intermediate', 'advanced'], { error: 'Selecciona tu nivel de experiencia' }),
  financialMetrics: FinancialMetricsSchema.optional(),
})

export const UpdateEmergencyFundMonthsSchema = z.object({
  months: z.number().int().min(1).max(60),
})

export const UpdateLiquidityReserveSchema = z.object({
  amount: z.number().min(0),
})

export const ChatMessageSchema = z.object({
  message: z
    .string({ error: 'El mensaje es obligatorio' })
    .min(2, 'El mensaje debe tener al menos 2 caracteres')
    .max(5000, 'El mensaje no puede superar los 5.000 caracteres')
    .trim()
    .refine((val) => val.length >= 2, 'El mensaje debe tener al menos 2 caracteres después de eliminar espacios'),
})

export const RecommendationsRequestSchema = z.object({
  profile: z.enum(['conservative', 'balanced', 'dynamic']).optional(),
  monthlyAmount: z.number().positive().optional(),
  includeExplanation: z.boolean().optional(),
})

export const ExplainConceptSchema = z.object({
  q: z.string().min(1).max(200),
})
