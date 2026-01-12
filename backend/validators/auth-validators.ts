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
