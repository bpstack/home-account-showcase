// lib/queries/transactions.ts - React Query hooks for transactions

import { useQuery, useMutation } from '@tanstack/react-query'
import {
  transactions as transactionsApi,
  TransactionParams,
  CreateTransactionData,
  UpdateTransactionData,
} from '../apiClient'

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

export function useTransactions(params: TransactionParams, options?: UseTransactionsOptions) {
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => transactionsApi.getAll(params),
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
  return useMutation({
    mutationFn: (data: CreateTransactionData) => transactionsApi.create(data),
  })
}

export function useUpdateTransaction() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionData }) =>
      transactionsApi.update(id, data),
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
