// lib/api/transactions.ts - Funciones de API para Server Components

import { serverFetch } from '../serverApi'
import type {
  StatsResponse,
  SummaryResponse,
  MonthlySummaryResponse,
  BalanceHistoryResponse,
  TransactionsResponse,
} from './types'

/**
 * Obtener estadísticas de transacciones
 */
export async function getTransactionStats(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<StatsResponse> {
  const params = new URLSearchParams({
    account_id: accountId,
    start_date: startDate,
    end_date: endDate,
  })
  return serverFetch<StatsResponse>(`/transactions/stats?${params}`)
}

/**
 * Obtener resumen por categorías
 */
export async function getTransactionSummary(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<SummaryResponse> {
  const params = new URLSearchParams({
    account_id: accountId,
    start_date: startDate,
    end_date: endDate,
  })
  return serverFetch<SummaryResponse>(`/transactions/summary?${params}`)
}

/**
 * Obtener resumen mensual del año
 */
export async function getMonthlySummary(
  accountId: string,
  year: number
): Promise<MonthlySummaryResponse> {
  const params = new URLSearchParams({
    account_id: accountId,
    year: year.toString(),
  })
  return serverFetch<MonthlySummaryResponse>(`/transactions/monthly-summary?${params}`)
}

/**
 * Obtener historial de balance
 */
export async function getBalanceHistory(
  accountId: string,
  year: number
): Promise<BalanceHistoryResponse> {
  const params = new URLSearchParams({
    account_id: accountId,
    year: year.toString(),
  })
  return serverFetch<BalanceHistoryResponse>(`/transactions/balance-history?${params}`)
}

/**
 * Obtener lista de transacciones
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
