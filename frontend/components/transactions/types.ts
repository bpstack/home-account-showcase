// components/transactions/types.ts

import type { Transaction } from '@/lib/apiClient'

export interface TransactionTableProps {
  transactions: Transaction[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onCategoryClick?: (transaction: Transaction) => void
  isLoading?: boolean
}

export interface CategoryChangeModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  accountId: string
  onSuccess: () => void
}
