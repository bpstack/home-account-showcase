import { z } from 'zod'

export const createCategorySchema = z.object({
  account_id: z.string().uuid('account_id debe ser un UUID válido'),
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres'),
  name_encrypted: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50, 'El icono no puede exceder 50 caracteres').optional(),
})

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres')
    .optional(),
  name_encrypted: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50, 'El icono no puede exceder 50 caracteres').optional(),
})

export const createSubcategorySchema = z.object({
  category_id: z.string().uuid('category_id debe ser un UUID válido'),
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres'),
  name_encrypted: z.string().optional(),
})

export const updateSubcategorySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(23, 'El nombre no puede exceder 23 caracteres')
    .optional(),
  name_encrypted: z.string().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>
