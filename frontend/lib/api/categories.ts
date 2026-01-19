// lib/api/categories.ts - Funciones de API para Server Components

import { serverFetch } from '../serverApi'
import type { CategoriesResponse } from './types'

/**
 * Obtener todas las categorías de una cuenta
 */
export async function getCategories(accountId: string): Promise<CategoriesResponse> {
  return serverFetch<CategoriesResponse>(`/categories?account_id=${accountId}`)
}
