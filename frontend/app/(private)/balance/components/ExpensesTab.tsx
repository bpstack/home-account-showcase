import React from 'react'
import { Card, CardContent } from '@/components/ui'
import { TransactionsSection } from './TransactionsSection'
import type { Transaction } from '@/lib/apiClient'
import { TrendingDown } from 'lucide-react'

interface PeriodStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
  incomeByType: Record<string, number>
}

interface CategoryData {
  name: string
  color: string
  amount: number
}

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ExpensesTabProps {
  stats: PeriodStats
  expensesByCategory: CategoryData[]
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
  periodLabel: string
}

export function ExpensesTab({
  stats,
  expensesByCategory,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
  periodLabel,
}: ExpensesTabProps) {
  const hasExpenses = stats.expenses > 0
  const expensePercentage =
    stats.income > 0 ? ((stats.expenses / stats.income) * 100).toFixed(1) : null

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-rose-50/80 to-red-50/50 dark:from-rose-950/30 dark:to-red-950/20 border-rose-200/50 dark:border-rose-800/30">
        <CardContent className="py-6 px-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Gastos</p>
          <p className="text-3xl sm:text-4xl font-bold text-rose-600 dark:text-rose-400">
            -{formatCurrency(stats.expenses)}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
              <TrendingDown className="h-3 w-3 text-rose-500" />
            </span>
            {expensePercentage && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 text-muted-foreground">
                {expensePercentage}% de ingresos
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 text-muted-foreground">
              {periodLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      {hasExpenses && expensesByCategory.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {expensesByCategory.map((cat) => {
            const percentage = (cat.amount / stats.expenses) * 100
            return (
              <Card key={cat.name} className="hover:border-layer-3 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <p className="text-xs text-text-secondary truncate">{cat.name}</p>
                  </div>
                  <p className="text-base font-bold text-text-primary">
                    {formatCurrency(cat.amount)}
                  </p>
                  <div className="mt-2 h-1 bg-layer-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-text-secondary">
              No hay gastos registrados en este período
            </p>
          </CardContent>
        </Card>
      )}

      <TransactionsSection
        data={data}
        setPage={setPage}
        showTransactions={showTransactions}
        setShowTransactions={setShowTransactions}
        onCategoryClick={onCategoryClick}
        title="Detalle de gastos"
      />
    </div>
  )
}
