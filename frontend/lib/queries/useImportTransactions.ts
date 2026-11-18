// lib/queries/useImportTransactions.ts - Hook con optimistic updates para import masivo

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importApi } from '../apiClient'
import { transactionKeys } from './transactions'
import { useCryptoStore } from '@/stores/cryptoStore'
import { buildImportPayload, type CategoryChoice, type ImportMovement } from '../import/confirm'

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
  movements: ImportMovement[]
  /** The app subcategory chosen for each bank category pair */
  choices: CategoryChoice[]
}

function choiceKey(category: string | null, subcategory: string | null): string {
  return JSON.stringify([category ?? '', subcategory ?? ''])
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
  const getAccountKey = useCryptoStore((s) => s.getAccountKey)

  return useMutation({
    mutationFn: async (data: ImportConfirmData) => {
      // No unencrypted fallback (ADR-008): a locked account does not import
      const accountKey = getAccountKey(data.account_id)
      if (!accountKey) {
        throw new Error('La cuenta está bloqueada: introduce el PIN para importar')
      }

      const payload = await buildImportPayload(
        data.account_id,
        accountKey,
        data.movements,
        data.choices
      )
      const res = await importApi.confirm(payload)
      return res.data
    },

    // Optimistic update: mostrar transacciones inmediatamente
    onMutate: async (newData) => {
      // Cancelar queries en progreso para evitar race conditions
      await queryClient.cancelQueries({ queryKey: transactionKeys.all })

      // Guardar estado anterior para rollback
      const previousQueries = queryClient.getQueriesData<TransactionsCache>({
        queryKey: transactionKeys.lists(newData.account_id),
      })

      // Subcategoría elegida por cada par de categorías del banco
      const categoryMap = new Map<string, string | null>()
      newData.choices.forEach((c) =>
        categoryMap.set(choiceKey(c.category, c.subcategory), c.subcategory_id)
      )

      // Crear transacciones optimistas (solo en la caché de este navegador)
      const optimisticTransactions: OptimisticTransaction[] = newData.movements.map(
        (movement, index) => ({
          id: `optimistic-${Date.now()}-${index}`,
          account_id: newData.account_id,
          date: movement.date,
          description: movement.description,
          amount: movement.amount,
          subcategory_id:
            categoryMap.get(choiceKey(movement.category, movement.subcategory)) || null,
          bank_category: movement.category,
          bank_subcategory: movement.subcategory,
          created_at: new Date().toISOString(),
          _optimistic: true as const,
        })
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
