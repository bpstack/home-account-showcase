import React from 'react'
import { Card, CardContent } from '@/components/ui'
import { TransactionsSection } from './TransactionsSection'
import type { Transaction } from '@/lib/apiClient'
import { TrendingUp } from 'lucide-react'

interface PeriodStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
  incomeByType: Record<string, number>
}

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface IncomeTabProps {
  stats: PeriodStats
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
  periodLabel: string
}

export function IncomeTab({
  stats,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
  periodLabel,
}: IncomeTabProps) {
  const incomeTypes = [
    { key: 'Nómina', label: 'Nómina', icon: '💼' },
    { key: 'Transferencias', label: 'Transferencias', icon: '💸' },
    { key: 'Bizum', label: 'Bizum', icon: '📱' },
    { key: 'Bonificaciones', label: 'Bonificaciones', icon: '🎁' },
    { key: 'Otros Ingresos', label: 'Otros', icon: '📈' },
  ]

  const hasIncome = stats.income > 0

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20 border-emerald-200/50 dark:border-emerald-800/30">
        <CardContent className="py-6 px-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total Ingresos</p>
          <p className="text-3xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(stats.income)}
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 text-muted-foreground">
              {periodLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      {hasIncome ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {incomeTypes.map(({ key, label, icon }) => {
            const value = stats.incomeByType[key] || 0
            if (value === 0) return null
            const percentage = (value / stats.income) * 100
            return (
              <Card key={key} className="hover:border-success/30 transition-colors">
                <CardContent className="py-4 text-center">
                  <span className="text-2xl mb-2 block">{icon}</span>
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <p className="text-base font-bold text-success">{formatCurrency(value)}</p>
                  <p className="text-xs text-text-secondary">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-text-secondary">
              No hay ingresos registrados en este período
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
        title="Detalle de ingresos"
      />
    </div>
  )
}
