// validators/auth-validators.ts

import { z } from 'zod'

/**
 * Schema de validación para registro
 */
export const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email es requerido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre es muy largo'),
  accountName: z.string().max(100, 'El nombre de la cuenta es muy largo').optional(),
  skipDefaultAccount: z.boolean().optional(), // Para usuarios que vienen de invitación
  encryptedAccountKey: z.string().optional(), // Encrypted AK for envelope encryption
  verificationBlob: z.string().optional(), // Verification blob for PIN validation
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
