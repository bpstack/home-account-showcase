// lib/api/transactions.ts - Funciones de API para Server Components
// NOTA: Con E2E encryption, los Server Components NO deben fetch datos cifrados.
// Los Client Components usan hooks de React Query que descifran automáticamente.

import { serverFetch } from '../serverApi'
import type { TransactionsResponse } from './types'

/**
 * Obtener lista de transacciones (raw - sin descifrar)
 * NOTA: Solo usar si el Server Component necesita pasar datos al cliente.
 * El cliente debe descifrar usando useTransactions() hook.
 */
export async function getTransactions(
  accountId: string,
  options?: {
    startDate?: string
    endDate?: string
    search?: string
    type?: 'income' | 'expense' | 'all'
    limit?: number
    offset?: number
  }
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({ account_id: accountId })

  if (options?.startDate) params.set('start_date', options.startDate)
  if (options?.endDate) params.set('end_date', options.endDate)
  if (options?.search) params.set('search', options.search)
  if (options?.type) params.set('type', options.type)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())

  return serverFetch<TransactionsResponse>(`/transactions?${params}`)
}
