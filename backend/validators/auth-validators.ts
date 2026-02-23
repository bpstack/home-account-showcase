// validators/auth-validators.ts

import { z } from 'zod'

/**
 * Schema de validación para registro
 */
export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Por favor ingresa un email válido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial'),
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede tener más de 100 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  accountName: z.string().max(100, 'El nombre de la cuenta es muy largo').optional(),
  skipDefaultAccount: z.boolean().optional(),
  encryptedAccountKey: z.string().optional(),
  verificationBlob: z.string().optional(),
})

/**
 * Schema de validación para login
 */
export const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(1, 'Password es requerido'),
})

/**
 * Schema de validación para refresh token
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
})

/**
 * Schema de validación para PIN (6-8 dígitos numéricos)
 */
export const pinSchema = z.object({
  pin: z
    .string()
    .min(6, 'El PIN debe tener al menos 6 dígitos')
    .max(8, 'El PIN debe tener máximo 8 dígitos')
    .regex(/^\d+$/, 'El PIN solo puede contener números'),
})

/**
 * Schema para cambiar PIN (requiere verificación actual)
 */
export const changePinSchema = z.object({
  currentPassword: z.string().min(1, 'Se requiere la contraseña o PIN actual'),
  newPin: z
    .string()
    .min(6, 'El PIN debe tener al menos 6 dígitos')
    .max(8, 'El PIN debe tener máximo 8 dígitos')
    .regex(/^\d+$/, 'El PIN solo puede contener números'),
  newKeySalt: z.string().min(1, 'Se requiere el nuevo salt'),
  verificationBlob: z.string().min(1, 'Se requiere el verification blob'),
  reEncryptedKeys: z.array(
    z.object({
      accountId: z.string(),
      encryptedKey: z.string(),
    })
  ),
})

/**
 * Tipo inferido para registro
 */
export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Tipo inferido para login
 */
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Tipo inferido para refresh
 */
export type RefreshInput = z.infer<typeof refreshSchema>

/**
 * Tipo inferido para PIN
 */
export type PinInput = z.infer<typeof pinSchema>

/**
 * Tipo inferido para cambio de PIN
 */
export type ChangePinInput = z.infer<typeof changePinSchema>
