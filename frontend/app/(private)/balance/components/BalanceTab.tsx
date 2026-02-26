import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui'
import { TransactionsSection } from './TransactionsSection'
import type { Transaction } from '@/lib/apiClient'
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react'

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

interface BalanceTabProps {
  stats: PeriodStats
  expensesByCategory: CategoryData[]
  incomeByCategory: CategoryData[]
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
  periodLabel: string
}

export function BalanceTab({
  stats,
  expensesByCategory,
  incomeByCategory,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
  periodLabel,
}: BalanceTabProps) {
  const savingsRate = stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="py-3 px-1 sm:px-4 flex flex-col items-center justify-center text-center min-h-[100px]">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Ingresos</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
              +{formatCurrency(stats.income)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1 sm:mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3 text-emerald-500" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50/80 to-red-50/50 dark:from-rose-950/30 dark:to-red-950/20 border-rose-200/50 dark:border-rose-800/30">
          <CardContent className="py-3 px-1 sm:px-4 flex flex-col items-center justify-center text-center min-h-[100px]">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Gastos</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
              -{formatCurrency(stats.expenses)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1 sm:mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3 text-rose-500" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br ${stats.balance >= 0 ? 'from-blue-50/80 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-800/30' : 'from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/30'}`}
        >
          <CardContent className="py-3 px-1 sm:px-4 flex flex-col items-center justify-center text-center min-h-[100px]">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Ahorro</p>
            <p
              className={`text-lg sm:text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} whitespace-nowrap`}
            >
              {stats.balance >= 0 ? '+' : ''}
              {formatCurrency(stats.balance)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1 sm:mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <PiggyBank
                  className={`h-2 w-2 sm:h-3 sm:w-3 ${stats.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}
                />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50/80 to-purple-50/50 dark:from-violet-950/30 dark:to-purple-950/20 border-violet-200/50 dark:border-violet-800/30">
          <CardContent className="py-3 px-1 sm:px-4 flex flex-col items-center justify-center text-center min-h-[100px]">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Tasa</p>
            <p className="text-lg sm:text-2xl font-bold text-violet-600 dark:text-violet-400 whitespace-nowrap">
              {savingsRate}%
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1 mt-1 sm:mt-2">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <Wallet className="h-2 w-2 sm:h-3 sm:w-3 text-violet-500" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(incomeByCategory.length > 0 || expensesByCategory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 border-b border-layer-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  Ingresos
                </div>
                <span className="text-lg font-bold text-success">
                  +{formatCurrency(stats.income)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {incomeByCategory.length > 0 ? (
                <div className="space-y-3">
                  {incomeByCategory.slice(0, 5).map((cat) => {
                    const percentage = stats.income > 0 ? (cat.amount / stats.income) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary ml-3 shrink-0">
                            {formatCurrency(cat.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-6">Sin ingresos</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader className="pb-2 border-b border-layer-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger" />
                  Gastos
                </div>
                <span className="text-lg font-bold text-danger">
                  -{formatCurrency(stats.expenses)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {expensesByCategory.slice(0, 8).map((cat) => {
                    const percentage = stats.expenses > 0 ? (cat.amount / stats.expenses) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-xs text-text-secondary w-10 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="text-sm font-medium text-text-primary w-24 text-right">
                              {formatCurrency(cat.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-6">Sin gastos</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <TransactionsSection
        data={data}
        setPage={setPage}
        showTransactions={showTransactions}
        setShowTransactions={setShowTransactions}
        onCategoryClick={onCategoryClick}
        title="Todas las transacciones"
      />
    </div>
  )
}
