// lib/queries/transactions.ts - React Query hooks for transactions
// Architecture: React Query manages remote data, encryption is transparent

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  transactions as transactionsApi,
  TransactionParams,
  CreateTransactionData,
  UpdateTransactionData,
} from '../apiClient'
import { useCryptoStore } from '@/stores/cryptoStore'
import { encrypt, decrypt, getAmountSign, type EncryptedTransaction } from '../crypto'

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: (accountId: string) => ['transactions', 'list', accountId] as const,
  list: (params: TransactionParams) => ['transactions', 'list', params.account_id, params] as const,
  details: (accountId: string) => ['transactions', 'details', accountId] as const,
  summary: (accountId: string, startDate?: string, endDate?: string) =>
    ['transactions', 'summary', accountId, startDate, endDate] as const,
}

import type { Transaction } from '../apiClient'

interface UseTransactionsOptions {
  staleTime?: number
  initialData?: { transactions: Transaction[]; total: number; limit: number; offset: number }
}

// Helper to decrypt a single transaction if encrypted
async function decryptTransaction(
  t: Transaction & Partial<EncryptedTransaction>,
  accountKey: CryptoKey
): Promise<Transaction> {
  // If encrypted fields exist, decrypt them
  if (t.description_encrypted) {
    return {
      ...t,
      description: await decrypt(t.description_encrypted, accountKey),
      amount: t.amount_encrypted
        ? parseFloat(await decrypt(t.amount_encrypted, accountKey))
        : t.amount,
      bank_category: t.bank_category_encrypted
        ? await decrypt(t.bank_category_encrypted, accountKey)
        : t.bank_category,
      bank_subcategory: t.bank_subcategory_encrypted
        ? await decrypt(t.bank_subcategory_encrypted, accountKey)
        : t.bank_subcategory,
    }
  }
  // Not encrypted, return as-is
  return t
}

export function useTransactions(params: TransactionParams, options?: UseTransactionsOptions) {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)
  const isAccountUnlocked = useCryptoStore((s) => s.isAccountUnlocked)

  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: async () => {
      const response = await transactionsApi.getAll(params)

      // Decrypt if account is unlocked and data is encrypted
      const accountKey = getAccountKey(params.account_id)
      if (accountKey && response.transactions.length > 0) {
        const firstTx = response.transactions[0] as Transaction & Partial<EncryptedTransaction>
        if (firstTx.description_encrypted) {
          const decryptedTxs = await Promise.all(
            response.transactions.map((t) =>
              decryptTransaction(t as Transaction & Partial<EncryptedTransaction>, accountKey)
            )
          )
          return { ...response, transactions: decryptedTxs }
        }
      }

      return response
    },
    staleTime: options?.staleTime ?? 0,
    initialData: options?.initialData,
  })
}

interface StatsResponse {
  success: boolean
  stats: {
    income: number
    expenses: number
    balance: number
    transactionCount: number
    incomeByType: Record<string, number>
  }
}

interface UseTransactionStatsOptions {
  initialData?: StatsResponse
}

/**
 * Calculate stats from transactions (client-side)
 * Works with both encrypted and unencrypted data
 */
function calculateStatsFromTransactions(transactions: Transaction[]): StatsResponse['stats'] {
  const incomeTransactions = transactions.filter((t) => Number(t.amount) > 0)
  const income = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0)

  const expenses = transactions
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  const balance = income - expenses

  // Classify income by type based on description
  const incomeByType: Record<string, number> = {}
  for (const t of incomeTransactions) {
    const desc = t.description.toLowerCase()
    let type = 'Otros Ingresos'
    if (desc.includes('nómina') || desc.includes('nomina')) {
      type = 'Nómina'
    } else if (desc.includes('transferencia') || desc.includes('transfer')) {
      type = 'Transferencias'
    } else if (desc.includes('bizum')) {
      type = 'Bizum'
    } else if (desc.includes('bonus') || desc.includes('bonific')) {
      type = 'Bonificaciones'
    }
    incomeByType[type] = (incomeByType[type] || 0) + Number(t.amount)
  }

  return {
    income,
    expenses,
    balance,
    transactionCount: transactions.length,
    incomeByType,
  }
}

/**
 * Get transaction stats - calculates client-side from decrypted transactions
 * This replaces the server-side calculation which cannot decrypt data
 */
export function useTransactionStats(
  accountId: string,
  startDate: string,
  endDate: string,
  options?: UseTransactionStatsOptions
) {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  // Fetch all transactions for the period (they get decrypted automatically)
  const { data: txData, isLoading, error } = useTransactions({
    account_id: accountId,
    start_date: startDate,
    end_date: endDate,
    limit: 10000, // Get all transactions for stats calculation
  })

  // Calculate stats client-side
  const stats = txData?.transactions ? calculateStatsFromTransactions(txData.transactions) : null

  return {
    data: stats ? { success: true, stats } : options?.initialData,
    isLoading,
    error,
  }
}

interface SummaryResponse {
  success: boolean
  summary: Array<{
    category_name: string
    category_color: string
    subcategory_name: string
    total_amount: number
    transaction_count: number
  }>
}

interface UseTransactionSummaryOptions {
  initialData?: SummaryResponse
}

/**
 * Calculate summary by category from transactions (client-side)
 */
function calculateSummaryFromTransactions(transactions: Transaction[]): SummaryResponse['summary'] {
  const summaryMap = new Map<string, {
    category_name: string
    category_color: string
    subcategory_name: string
    total_amount: number
    transaction_count: number
  }>()

  for (const t of transactions) {
    const categoryName = t.category_name || 'Sin categoría'
    const subcategoryName = t.subcategory_name || 'Sin subcategoría'
    const key = `${categoryName}-${subcategoryName}`

    const existing = summaryMap.get(key)
    if (existing) {
      existing.total_amount += Number(t.amount)
      existing.transaction_count += 1
    } else {
      summaryMap.set(key, {
        category_name: categoryName,
        category_color: t.category_color || '#6B7280',
        subcategory_name: subcategoryName,
        total_amount: Number(t.amount),
        transaction_count: 1,
      })
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) => a.total_amount - b.total_amount)
}

/**
 * Get transaction summary by category - calculates client-side from decrypted transactions
 */
export function useTransactionSummary(
  accountId: string,
  startDate?: string,
  endDate?: string,
  options?: UseTransactionSummaryOptions
) {
  // Fetch all transactions for the period (they get decrypted automatically)
  const { data: txData, isLoading, error } = useTransactions({
    account_id: accountId,
    start_date: startDate,
    end_date: endDate,
    limit: 10000, // Get all transactions for summary calculation
  })

  // Calculate summary client-side
  const summary = txData?.transactions ? calculateSummaryFromTransactions(txData.transactions) : null

  return {
    data: summary ? { success: true, summary } : options?.initialData,
    isLoading,
    error,
  }
}

export function useTransactionById(id: string) {
  return useQuery({
    queryKey: ['transactions', 'detail', id] as const,
    queryFn: () => transactionsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateTransaction() {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      const accountKey = getAccountKey(data.account_id)

      // If encryption is enabled (account unlocked), encrypt the data
      if (accountKey) {
        const encryptedData = {
          account_id: data.account_id,
          date: data.date,
          subcategory_id: data.subcategory_id,
          // Encrypted fields
          description_encrypted: await encrypt(data.description, accountKey),
          amount_encrypted: await encrypt(data.amount.toString(), accountKey),
          amount_sign: getAmountSign(data.amount),
          bank_category_encrypted: data.bank_category
            ? await encrypt(data.bank_category, accountKey)
            : null,
          bank_subcategory_encrypted: data.bank_subcategory
            ? await encrypt(data.bank_subcategory, accountKey)
            : null,
        }
        return transactionsApi.createEncrypted(encryptedData)
      }

      // Fallback: send unencrypted (for migration period)
      return transactionsApi.create(data)
    },
  })
}

export function useUpdateTransaction() {
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async ({
      id,
      data,
      accountId,
    }: {
      id: string
      data: UpdateTransactionData
      accountId: string
    }) => {
      const accountKey = getAccountKey(accountId)

      // If encryption is enabled, encrypt the data
      if (accountKey && data.description !== undefined) {
        const encryptedData: Record<string, unknown> = {
          date: data.date,
          subcategory_id: data.subcategory_id,
        }

        if (data.description !== undefined) {
          encryptedData.description_encrypted = await encrypt(data.description, accountKey)
        }
        if (data.amount !== undefined) {
          encryptedData.amount_encrypted = await encrypt(data.amount.toString(), accountKey)
          encryptedData.amount_sign = getAmountSign(data.amount)
        }
        if (data.bank_category !== undefined) {
          encryptedData.bank_category_encrypted = data.bank_category
            ? await encrypt(data.bank_category, accountKey)
            : null
        }
        if (data.bank_subcategory !== undefined) {
          encryptedData.bank_subcategory_encrypted = data.bank_subcategory
            ? await encrypt(data.bank_subcategory, accountKey)
            : null
        }

        return transactionsApi.updateEncrypted(id, encryptedData)
      }

      // Fallback: send unencrypted
      return transactionsApi.update(id, data)
    },
  })
}

export function useDeleteTransaction() {
  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
  })
}

export function useBulkUpdatePreview(accountId: string, descriptionPattern: string) {
  return useQuery({
    queryKey: ['transactions', 'bulk-preview', accountId, descriptionPattern] as const,
    queryFn: () => transactionsApi.bulkUpdatePreview(accountId, descriptionPattern),
    enabled: !!accountId && !!descriptionPattern,
  })
}

export function useBulkUpdateCategory() {
  return useMutation({
    mutationFn: (data: {
      account_id: string
      description_pattern: string
      subcategory_id: string | null
      save_mapping?: boolean
    }) => transactionsApi.bulkUpdateCategory(data),
  })
}

/**
 * Bulk update transactions by IDs
 * Works with encrypted data - client filters decrypted transactions and sends IDs
 */
export function useBulkUpdateByIds() {
  return useMutation({
    mutationFn: (data: {
      account_id: string
      transaction_ids: string[]
      subcategory_id: string | null
    }) => transactionsApi.bulkUpdateByIds(data),
  })
}

// ============================================
// MONTHLY SUMMARY - Client-side calculation
// ============================================

interface MonthlySummaryItem {
  month: string
  income: number
  expenses: number
  [key: string]: string | number // Index signature for chart compatibility
}

interface MonthlySummaryResponse {
  success: boolean
  monthlySummary: MonthlySummaryItem[]
}

/**
 * Calculate monthly summary from transactions (client-side)
 */
function calculateMonthlySummaryFromTransactions(
  transactions: Transaction[],
  year: number
): MonthlySummaryItem[] {
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // Initialize all months
  const monthlyData: Record<number, { income: number; expenses: number }> = {}
  for (let i = 0; i < 12; i++) {
    monthlyData[i] = { income: 0, expenses: 0 }
  }

  // Group by month
  for (const tx of transactions) {
    const date = new Date(tx.date)
    if (date.getFullYear() !== year) continue

    const month = date.getMonth()
    const amount = Number(tx.amount)

    if (amount > 0) {
      monthlyData[month].income += amount
    } else {
      monthlyData[month].expenses += Math.abs(amount)
    }
  }

  // Convert to array
  return monthNames.map((name, index) => ({
    month: name,
    income: Math.round(monthlyData[index].income * 100) / 100,
    expenses: Math.round(monthlyData[index].expenses * 100) / 100,
  }))
}

/**
 * Get monthly summary - calculates client-side from decrypted transactions
 */
export function useMonthlySummary(accountId: string, year: number) {
  // Fetch all transactions for the year
  const { data: txData, isLoading, error } = useTransactions({
    account_id: accountId,
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    limit: 10000,
  })

  const monthlySummary = txData?.transactions
    ? calculateMonthlySummaryFromTransactions(txData.transactions, year)
    : null

  return {
    data: monthlySummary ? { success: true, monthlySummary } as MonthlySummaryResponse : undefined,
    isLoading,
    error,
  }
}

// ============================================
// BALANCE HISTORY - Client-side calculation
// ============================================

interface BalanceHistoryItem {
  date: string
  fullDate: string
  balance: number
  [key: string]: string | number // Index signature for chart compatibility
}

interface BalanceHistoryResponse {
  success: boolean
  balanceHistory: BalanceHistoryItem[]
}

/**
 * Calculate balance history from transactions (client-side)
 */
function calculateBalanceHistoryFromTransactions(
  transactions: Transaction[],
  year: number
): BalanceHistoryItem[] {
  const today = new Date()
  const endDate = year === today.getFullYear()
    ? today
    : new Date(year, 11, 31)

  // Sort transactions by date
  const sortedTxs = [...transactions].sort((a, b) => a.date.localeCompare(b.date))

  // Group transactions by date
  const transactionsByDate: Record<string, number> = {}
  for (const tx of sortedTxs) {
    const date = tx.date.split('T')[0]
    transactionsByDate[date] = (transactionsByDate[date] || 0) + Number(tx.amount)
  }

  // Generate daily balance history
  const result: BalanceHistoryItem[] = []
  let cumulative = 0
  const start = new Date(year, 0, 1)

  for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    cumulative += transactionsByDate[dateStr] || 0

    result.push({
      date: dateStr.substring(5), // MM-DD format
      fullDate: dateStr,
      balance: Math.round(cumulative * 100) / 100,
    })
  }

  return result
}

/**
 * Get balance history - calculates client-side from decrypted transactions
 */
export function useBalanceHistory(accountId: string, year: number) {
  // Fetch all transactions for the year
  const { data: txData, isLoading, error } = useTransactions({
    account_id: accountId,
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    limit: 10000,
  })

  const balanceHistory = txData?.transactions
    ? calculateBalanceHistoryFromTransactions(txData.transactions, year)
    : null

  return {
    data: balanceHistory ? { success: true, balanceHistory } as BalanceHistoryResponse : undefined,
    isLoading,
    error,
  }
}
