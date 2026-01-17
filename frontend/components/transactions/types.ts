// components/transactions/types.ts

import type { Transaction } from '@/lib/apiClient'

export interface CategoryChangeModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
  accountId: string
  onSuccess: () => void
}
