import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Transaction } from '@/lib/apiClient'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { ResponsiveTransactionTable } from '@/components/transactions/ResponsiveTransactionTable'

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface TransactionsSectionProps {
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
  title: string
}

export function TransactionsSection({
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
  title,
}: TransactionsSectionProps) {
  return (
    <Card>
      <div
        className="px-3 sm:px-4 py-3 cursor-pointer hover:bg-layer-2/50 transition-colors"
        onClick={() => setShowTransactions(!showTransactions)}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-text-primary shrink-0">
              {title}
            </h3>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-0.5 rounded-full shrink-0">
              {data.total} transacciones
            </span>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0">
            {showTransactions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            • Ve a Transactions para modificar
          </span>
        </div>
      </div>
      {showTransactions && (
        <CardContent className="pt-0">
          <ResponsiveTransactionTable
            transactions={data.transactions}
            total={data.total}
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            onCategoryClick={onCategoryClick}
          />
        </CardContent>
      )}
    </Card>
  )
}
