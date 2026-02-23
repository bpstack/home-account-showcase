import { z } from 'zod'

export const categorySchema = z.object({
  account_id: z.string().uuid('ID de cuenta inválido'),
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
    .max(23, 'El nombre no puede exceder 23 caracteres'),
  name_encrypted: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un código hexadecimal válido')
    .optional()
    .or(z.literal('')),
  icon: z.string().max(50, 'El icono no puede exceder 50 caracteres').optional(),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

export function validateCategory(data: CategoryInput) {
  const result = categorySchema.safeParse(data)

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

export function validateUpdateCategory(data: UpdateCategoryInput) {
  const result = updateCategorySchema.safeParse(data)

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

export const subcategorySchema = z.object({
  category_id: z.string().uuid('Selecciona una categoría'),
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
    .max(23, 'El nombre no puede exceder 23 caracteres'),
  name_encrypted: z.string().optional(),
})

export type SubcategoryInput = z.infer<typeof subcategorySchema>
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>

export function validateSubcategory(data: SubcategoryInput) {
  const result = subcategorySchema.safeParse(data)

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

export function validateUpdateSubcategory(data: UpdateSubcategoryInput) {
  const result = updateSubcategorySchema.safeParse(data)

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
