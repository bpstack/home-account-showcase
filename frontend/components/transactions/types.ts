// components/transactions/types.ts

import type { Transaction } from '@/lib/apiClient'

export interface CategoryChangeModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  accountId: string
  /** All decrypted transactions for client-side matching (encrypted DB can't do LIKE) */
  allTransactions?: Transaction[]
  onSuccess: () => void
}
