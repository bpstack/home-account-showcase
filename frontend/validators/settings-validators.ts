import { z } from 'zod'

export const userNameSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
})

export const userEmailSchema = z.object({
  email: z.string().min(1, 'El email es obligatorio').email('Por favor ingresa un email válido'),
})

export const accountNameSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(27, 'El nombre no puede exceder 27 caracteres')
    .regex(
      /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)* ?[a-zA-Z0-9]*$/,
      'Solo letras, números, guiones y como máximo un espacio'
    ),
})

export type UserNameInput = z.infer<typeof userNameSchema>
export type UserEmailInput = z.infer<typeof userEmailSchema>
export type AccountNameInput = z.infer<typeof accountNameSchema>

export function validateUserName(data: UserNameInput) {
  const result = userNameSchema.safeParse(data)

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

export function validateUserEmail(data: UserEmailInput) {
  const result = userEmailSchema.safeParse(data)

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

export function validateAccountName(data: AccountNameInput) {
  const result = accountNameSchema.safeParse(data)

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
