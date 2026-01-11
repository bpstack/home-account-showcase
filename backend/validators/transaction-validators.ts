// validators/transaction-validators.ts

import { z } from 'zod'

/**
 * Schema para query params de getTransactions
 */
export const getTransactionsSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  start_date: z.string().date('start_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  end_date: z.string().date('end_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional(),
  min_amount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().finite('min_amount debe ser un número válido'))
    .optional(),
  max_amount: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().finite('max_amount debe ser un número válido'))
    .optional(),
  search: z.string().max(255, 'search no puede exceder 255 caracteres').optional(),
  type: z.enum(['income', 'expense', 'all']).optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().positive('limit debe ser un número positivo'))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(0, 'offset debe ser >= 0'))
    .optional(),
})

/**
 * Schema para crear transacción
 */
export const createTransactionSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  date: z.string().date('date debe ser fecha válida (YYYY-MM-DD)'),
  description: z
    .string()
    .min(1, 'description es requerida')
    .max(255, 'description no puede exceder 255 caracteres'),
  amount: z.number().finite('amount debe ser un número válido'),
  subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional().nullable(),
  bank_category: z.string().max(100).optional().nullable(),
  bank_subcategory: z.string().max(100).optional().nullable(),
})

/**
 * Schema para actualizar transacción
 */
export const updateTransactionSchema = z
  .object({
    date: z.string().date('date debe ser fecha válida (YYYY-MM-DD)').optional(),
    description: z
      .string()
      .min(1, 'description no puede estar vacía')
      .max(255, 'description no puede exceder 255 caracteres')
      .optional(),
    amount: z.number().finite('amount debe ser un número válido').optional(),
    subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  })

/**
 * Schema para summary query params
 */
export const getSummarySchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  start_date: z.string().date('start_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  end_date: z.string().date('end_date debe ser fecha válida (YYYY-MM-DD)').optional(),
})

/**
 * Schema para stats query params
 */
export const getStatsSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  start_date: z.string().date('start_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  end_date: z.string().date('end_date debe ser fecha válida (YYYY-MM-DD)').optional(),
})

/**
 * Schema para balance-history query params
 */
export const getBalanceHistorySchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  year: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(2000).max(2100)),
})

/**
 * Schema para monthly-summary query params
 */
export const getMonthlySummarySchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  year: z
    .string()
    .transform((val) => parseInt(val))
    .pipe(z.number().int().min(2000).max(2100)),
})

// Tipos inferidos
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type GetSummaryInput = z.infer<typeof getSummarySchema>
export type GetStatsInput = z.infer<typeof getStatsSchema>
export type GetBalanceHistoryInput = z.infer<typeof getBalanceHistorySchema>
export type GetMonthlySummaryInput = z.infer<typeof getMonthlySummarySchema>
