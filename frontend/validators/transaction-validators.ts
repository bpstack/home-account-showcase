import { z } from 'zod'

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

const today = new Date().toISOString().split('T')[0]

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    message: 'Selecciona el tipo de transacción',
  }),
  date: z
    .string()
    .min(1, 'La fecha es obligatoria')
    .refine((val) => isoDateRegex.test(val), {
      message: 'La fecha debe tener formato YYYY-MM-DD',
    })
    .refine((val) => val <= today, {
      message: 'La fecha no puede ser futura',
    }),
  description: z
    .string()
    .min(1, 'La descripción es obligatoria')
    .min(3, 'La descripción debe tener al menos 3 caracteres')
    .max(60, 'La descripción no puede exceder 60 caracteres'),
  amount: z
    .string()
    .min(1, 'El importe es obligatorio')
    .refine(
      (val) => {
        const num = parseFloat(val)
        return !isNaN(num) && num > 0
      },
      {
        message: 'El importe debe ser mayor a 0',
      }
    ),
  category_id: z.string().min(1, 'La categoría es obligatoria'),
  subcategory_id: z.string().optional().or(z.literal('')),
})

export type TransactionInput = z.infer<typeof transactionSchema>

export function validateTransaction(data: TransactionInput) {
  const result = transactionSchema.safeParse(data)

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
