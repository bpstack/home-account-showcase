import { z } from 'zod'

export const budgetSchema = z.object({
  category_id: z.string().min(1, 'Selecciona una categoría'),
  amount: z
    .string()
    .min(1, 'La cantidad es obligatoria')
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && num > 0
      },
      {
        message: 'La cantidad debe ser mayor a 0',
      }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && Number.isInteger(num)
      },
      {
        message: 'La cantidad debe ser un número entero',
      }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && num <= 900000
      },
      {
        message: 'La cantidad no puede exceder 900.000€',
      }
    ),
  period: z.enum(['weekly', 'monthly', 'yearly'], {
    message: 'Selecciona un periodo',
  }),
  alert_threshold: z.number().min(50).max(100).optional(),
})

export const updateBudgetSchema = z.object({
  amount: z
    .string()
    .min(1, 'La cantidad es obligatoria')
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && num > 0
      },
      {
        message: 'La cantidad debe ser mayor a 0',
      }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && Number.isInteger(num)
      },
      {
        message: 'La cantidad debe ser un número entero',
      }
    )
    .refine(
      (val) => {
        const num = parseInt(val, 10)
        return !isNaN(num) && num <= 900000
      },
      {
        message: 'La cantidad no puede exceder 900.000€',
      }
    )
    .optional(),
  period: z
    .enum(['weekly', 'monthly', 'yearly'], {
      message: 'Selecciona un periodo',
    })
    .optional(),
  alert_threshold: z.number().min(50).max(100).optional(),
})

export type BudgetInput = z.infer<typeof budgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>

export function validateBudget(data: BudgetInput) {
  const result = budgetSchema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!errors[field]) {
        errors[field] = issue.message
      }
    })
    return { success: false as const, errors }
  }

  return { success: true as const, data: result.data }
}

export function validateUpdateBudget(data: UpdateBudgetInput) {
  const result = updateBudgetSchema.safeParse(data)

  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as string
      if (!errors[field]) {
        errors[field] = issue.message
      }
    })
    return { success: false as const, errors }
  }

  return { success: true as const, data: result.data }
}
