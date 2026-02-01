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

export function useTransactionStats(
  accountId: string,
  startDate: string,
  endDate: string,
  options?: UseTransactionStatsOptions
) {
  return useQuery({
    queryKey: ['transactions', 'stats', accountId, startDate, endDate] as const,
    queryFn: () => transactionsApi.getStats(accountId, startDate, endDate),
    staleTime: 0,
    initialData: options?.initialData,
    enabled: !!accountId,
  })
}

interface SummaryResponse {
  success: boolean
  summary: Array<{
    category_name: string | null
    category_color: string | null
    total_amount: string | number
  }>
}

interface UseTransactionSummaryOptions {
  initialData?: SummaryResponse
}

export function useTransactionSummary(
  accountId: string,
  startDate?: string,
  endDate?: string,
  options?: UseTransactionSummaryOptions
) {
  return useQuery({
    queryKey: transactionKeys.summary(accountId, startDate, endDate),
    queryFn: () => transactionsApi.getSummary(accountId, startDate, endDate),
    staleTime: 0,
    initialData: options?.initialData,
    enabled: !!accountId,
  })
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
