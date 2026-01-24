// controllers/investment/validation.ts
// Zod schemas for investment module validation

import { z } from 'zod'

export const ProfileAnswersSchema = z.object({
  age: z.number().min(1).max(120),
  monthlyIncome: z.number().positive(),
  jobStability: z.enum(['high', 'medium', 'low']),
  hasEmergencyFund: z.enum(['yes', 'partial', 'no']),
  horizonYears: z.enum(['<3', '3-10', '>10']),
  reactionToDrop: z.enum(['sell', 'hold', 'buy_more']),
  experienceLevel: z.enum(['none', 'basic', 'intermediate', 'advanced'])
})

export const UpdateEmergencyFundMonthsSchema = z.object({
  months: z.number().int().min(1).max(60)
})

export const UpdateLiquidityReserveSchema = z.object({
  amount: z.number().min(0)
})

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(5000)
})

export const RecommendationsRequestSchema = z.object({
  profile: z.enum(['conservative', 'balanced', 'dynamic']).optional(),
  monthlyAmount: z.number().positive().optional(),
  includeExplanation: z.boolean().optional()
})

export const ExplainConceptSchema = z.object({
  q: z.string().min(1).max(200)
})
