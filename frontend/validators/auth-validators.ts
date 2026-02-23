import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .max(100, 'El nombre no puede tener más de 100 caracteres')
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
    email: z.string().min(1, 'El email es obligatorio').email('Por favor ingresa un email válido'),
    password: z
      .string()
      .min(6, 'La contraseña debe tener al menos 6 caracteres')
      .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
      .regex(
        /[^A-Za-z0-9]/,
        'La contraseña debe contener al menos un carácter especial (!@#$%^&*)'
      ),
    confirmPassword: z.string().min(1, 'Por favor confirma tu contraseña'),
    accountName: z
      .string()
      .max(100, 'El nombre de la cuenta no puede tener más de 100 caracteres')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export function validateRegister(data: RegisterInput) {
  const result = registerSchema.safeParse(data)

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
