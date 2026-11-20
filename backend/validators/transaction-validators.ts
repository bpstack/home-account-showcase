// validators/transaction-validators.ts

import { z } from 'zod'

/**
 * Schema para query params de getTransactions
 */
export const getTransactionsSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  start_date: z.string().date('start_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  end_date: z.string().date('end_date debe ser fecha válida (YYYY-MM-DD)').optional(),
  // One subcategory or several, comma-separated (the filter allows choosing many)
  subcategory_id: z
    .string()
    .transform((val) => val.split(',').filter(Boolean))
    .pipe(
      z
        .array(z.uuid('subcategory_id debe ser un UUID válido'))
        .min(1)
        .max(200, 'Demasiadas subcategorías en el filtro')
    )
    .optional(),
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
 * A transaction's own data (what it says, how much, the bank's labels) only reaches the server
 * encrypted (ADR-008). These are the plaintext names of those fields: a request carrying any of
 * them is refused, never stored.
 */
export const PLAINTEXT_TRANSACTION_FIELDS = [
  'description',
  'amount',
  'bank_category',
  'bank_subcategory',
] as const

export const PLAINTEXT_REFUSED_MESSAGE =
  'Los movimientos se guardan cifrados: desbloquea la cuenta e inténtalo de nuevo'

export function plaintextTransactionFields(body: unknown): string[] {
  if (!body || typeof body !== 'object') return []
  return PLAINTEXT_TRANSACTION_FIELDS.filter((field) => field in body)
}

/**
 * Schema para crear transacción encriptada
 */
export const createEncryptedTransactionSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  date: z
    .string()
    .min(1, 'La fecha es obligatoria')
    .date('La fecha debe ser válida (YYYY-MM-DD)')
    .refine((date) => date <= new Date().toISOString().split('T')[0], {
      message: 'La fecha no puede ser futura',
    }),
  subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional().nullable(),
  description_encrypted: z.string().min(1, 'La descripción encriptada es obligatoria'),
  amount_encrypted: z.string().min(1, 'El importe encriptado es obligatorio'),
  amount_sign: z.enum(['positive', 'negative'], {
    message: 'El tipo de importe debe ser positivo o negativo',
  }),
  bank_category_encrypted: z.string().optional().nullable(),
  bank_subcategory_encrypted: z.string().optional().nullable(),
})

/**
 * Schema para actualizar sin cifrar: solo fecha y subcategoría, que no son datos cifrados
 */
export const updateTransactionSchema = z
  .object({
    date: z
      .string()
      .min(1, 'La fecha es obligatoria')
      .date('La fecha debe ser válida (YYYY-MM-DD)')
      .refine((date) => date <= new Date().toISOString().split('T')[0], {
        message: 'La fecha no puede ser futura',
      })
      .optional(),
    subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
  })

/**
 * Schema para actualizar transacción encriptada
 */
export const updateEncryptedTransactionSchema = z
  .object({
    date: z.string().date('La fecha debe ser válida (YYYY-MM-DD)').optional(),
    subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').optional().nullable(),
    description_encrypted: z.string().optional(),
    amount_encrypted: z.string().optional(),
    amount_sign: z
      .enum(['positive', 'negative'], {
        message: 'El tipo de importe debe ser positivo o negativo',
      })
      .optional(),
    bank_category_encrypted: z.string().optional().nullable(),
    bank_subcategory_encrypted: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes proporcionar al menos un campo para actualizar',
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

/**
 * Schema para preview de bulk update (query params)
 */
export const bulkUpdatePreviewSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  description_pattern: z.string().min(1, 'description_pattern es requerido'),
})

/**
 * Schema para bulk update de categoría (body)
 * @deprecated Use bulkUpdateByIdsSchema for encrypted data support
 */
export const bulkUpdateCategorySchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  description_pattern: z.string().min(1, 'description_pattern es requerido'),
  subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').nullable(),
  save_mapping: z.boolean().optional().default(false),
})

/**
 * Schema para bulk update por IDs (body)
 * Works with encrypted data - client sends specific IDs after filtering decrypted data
 */
export const bulkUpdateByIdsSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  transaction_ids: z
    .array(z.string().uuid('Cada ID debe ser un UUID válido'))
    .min(1, 'Se requiere al menos un ID'),
  subcategory_id: z.string().uuid('subcategory_id debe ser un UUID válido').nullable(),
})

// Tipos inferidos
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>
export type CreateEncryptedTransactionInput = z.infer<typeof createEncryptedTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type UpdateEncryptedTransactionInput = z.infer<typeof updateEncryptedTransactionSchema>
export type GetSummaryInput = z.infer<typeof getSummarySchema>
export type GetStatsInput = z.infer<typeof getStatsSchema>
export type GetBalanceHistoryInput = z.infer<typeof getBalanceHistorySchema>
export type GetMonthlySummaryInput = z.infer<typeof getMonthlySummarySchema>
export type BulkUpdatePreviewInput = z.infer<typeof bulkUpdatePreviewSchema>
export type BulkUpdateCategoryInput = z.infer<typeof bulkUpdateCategorySchema>
export type BulkUpdateByIdsInput = z.infer<typeof bulkUpdateByIdsSchema>
