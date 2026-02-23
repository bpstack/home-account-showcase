import { z } from 'zod'

export const updateUserNameSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
})

export const updateUserEmailSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .email('Por favor ingresa un email válido'),
})

export const updateAccountNameSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(27, 'El nombre no puede exceder 27 caracteres')
    .regex(/^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)* ?[a-zA-Z0-9]*$/, 'Solo letras, números, guiones y como máximo un espacio'),
})

export type UpdateUserNameInput = z.infer<typeof updateUserNameSchema>
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>
export type UpdateAccountNameInput = z.infer<typeof updateAccountNameSchema>
