// lib/queries/useImportTransactions.ts - Hook con optimistic updates para import masivo

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importApi, ParsedTransaction, CategoryMapping } from '../apiClient'
import { transactionKeys } from './transactions'

export interface OptimisticTransaction {
  id: string
  account_id: string
  date: string
  description: string
  amount: number
  subcategory_id: string | null
  bank_category: string | null
  bank_subcategory: string | null
  created_at: string
  _optimistic: true
}

interface ImportConfirmData {
  account_id: string
  transactions: ParsedTransaction[]
  category_mappings: CategoryMapping[]
}

interface TransactionsCache {
  success: boolean
  transactions: Array<{
    id: string
    account_id: string
    date: string
    description: string
    amount: number
    subcategory_id: string | null
    bank_category: string | null
    bank_subcategory: string | null
    created_at: string
    _optimistic?: boolean
  }>
  total: number
  limit: number
  offset: number
}

export function useImportTransactions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ImportConfirmData) => importApi.confirm(data),

    // Optimistic update: mostrar transacciones inmediatamente
    onMutate: async (newData) => {
      // Cancelar queries en progreso para evitar race conditions
      await queryClient.cancelQueries({ queryKey: transactionKeys.all })

      // Guardar estado anterior para rollback
      const previousQueries = queryClient.getQueriesData<TransactionsCache>({
        queryKey: transactionKeys.lists(newData.account_id),
      })

      // Crear mapping de subcategory_id por banco
      const categoryMap = new Map<string, string | null>()
      newData.category_mappings.forEach((m) => {
        const key = `${m.bank_category}|${m.bank_subcategory}`
        categoryMap.set(key, m.subcategory_id)
      })

      // Crear transacciones optimistas
      const optimisticTransactions: OptimisticTransaction[] = newData.transactions.map(
        (tx, index) => {
          const key = `${tx.bank_category}|${tx.bank_subcategory}`
          return {
            id: `optimistic-${Date.now()}-${index}`,
            account_id: newData.account_id,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            subcategory_id: categoryMap.get(key) || null,
            bank_category: tx.bank_category,
            bank_subcategory: tx.bank_subcategory,
            created_at: new Date().toISOString(),
            _optimistic: true as const,
          }
        }
      )

      // Actualizar cache de forma optimista
      queryClient.setQueriesData<TransactionsCache>(
        { queryKey: transactionKeys.lists(newData.account_id) },
        (old) => {
          if (!old) return old
          return {
            ...old,
            transactions: [...optimisticTransactions, ...old.transactions],
            total: old.total + optimisticTransactions.length,
          }
        }
      )

      return { previousQueries }
    },

    // Rollback si falla
    onError: (_err, newData, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },

    // Sincronizar con servidor al completar (éxito o error)
    onSettled: (_data, _error, variables) => {
      // Invalidar todas las queries de transacciones para obtener datos reales
      queryClient.invalidateQueries({ queryKey: transactionKeys.all })
      // También invalidar stats y summary
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'stats', variables.account_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'summary', variables.account_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'monthly-summary', variables.account_id],
      })
      queryClient.invalidateQueries({
        queryKey: ['transactions', 'balance-history', variables.account_id],
      })
    },
  })
}
