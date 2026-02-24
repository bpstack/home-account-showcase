import { z } from 'zod'

// ─── Profile Form: per-field schemas ────────────────────────────────

export const ageSchema = z
  .string()
  .min(1, 'Introduce tu edad')
  .refine((val) => /^\d{1,2}$/.test(val), 'La edad debe tener 1 o 2 dígitos numéricos')
  .refine((val) => {
    const num = parseInt(val, 10)
    return num >= 18
  }, 'Debes tener al menos 18 años')
  .refine((val) => {
    const num = parseInt(val, 10)
    return num <= 99
  }, 'La edad máxima es 99 años')

export const monthlyIncomeSchema = z
  .string()
  .min(1, 'Introduce tus ingresos mensuales')
  .refine((val) => /^\d+$/.test(val), 'Solo se permiten números enteros, sin decimales ni símbolos')
  .refine((val) => {
    const num = parseInt(val, 10)
    return num > 0
  }, 'Los ingresos deben ser mayores a 0€')
  .refine((val) => {
    const num = parseInt(val, 10)
    return num <= 999999
  }, 'Los ingresos no pueden superar 999.999€')

// ─── Chat message schema ────────────────────────────────────────────

export const chatMessageSchema = z
  .string()
  .trim()
  .min(2, 'El mensaje debe tener al menos 2 caracteres')
  .max(5000, 'El mensaje no puede superar los 5.000 caracteres')

// ─── Validation helpers ─────────────────────────────────────────────

export function validateProfileField(
  field: string,
  value: string
): { success: true } | { success: false; error: string } {
  let schema: z.ZodType

  switch (field) {
    case 'age':
      schema = ageSchema
      break
    case 'monthlyIncome':
      schema = monthlyIncomeSchema
      break
    default:
      // Select fields are validated by selection — always valid if selected
      return { success: true }
  }

  const result = schema.safeParse(value)

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  return { success: true }
}

export function validateChatMessage(
  message: string
): { success: true; data: string } | { success: false; error: string } {
  const result = chatMessageSchema.safeParse(message)

  if (!result.success) {
    return { success: false, error: result.error.issues[0].message }
  }

  return { success: true, data: result.data }
}
