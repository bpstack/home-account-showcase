import { z } from 'zod'

export const createBudgetSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  category_id: z.string().uuid('category_id debe ser un UUID válido'),
  amount: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0')
    .max(900000, 'La cantidad no puede exceder 900.000€'),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    message: 'El periodo debe ser semanal, mensual o anual',
  }),
  alert_threshold: z
    .number()
    .int()
    .min(50, 'La alerta debe estar entre 50% y 100%')
    .max(100, 'La alerta debe estar entre 50% y 100%')
    .optional()
    .default(80),
})

export const updateBudgetSchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  amount: z
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0')
    .max(900000, 'La cantidad no puede exceder 900.000€')
    .optional(),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    message: 'El periodo debe ser semanal, mensual o anual',
  }).optional(),
  alert_threshold: z
    .number()
    .int()
    .min(50, 'La alerta debe estar entre 50% y 100%')
    .max(100, 'La alerta debe estar entre 50% y 100%')
    .optional(),
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
