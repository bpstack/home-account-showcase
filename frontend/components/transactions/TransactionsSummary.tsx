// components/transactions/TransactionsSummary.tsx

'use client'

import { Card, CardContent } from '@/components/ui'

interface TransactionsSummaryProps {
  totals: {
    income: number
    expenses: number
  }
}

export function TransactionsSummary({ totals }: TransactionsSummaryProps) {
  const income = Number(totals.income) || 0
  const expenses = Number(totals.expenses) || 0
  const balance = income - expenses

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} €`
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <CardContent className="py-3 sm:py-4 px-4">
          <p className="text-xs sm:text-sm text-text-secondary mb-1">Ingresos</p>
          <p className="text-lg sm:text-xl font-bold text-success">+{formatCurrency(income)}</p>
        </CardContent>
      </Card>
      <Card className="bg-gradient-to-br from-danger/10 to-danger/5 border-danger/20">
        <CardContent className="py-3 sm:py-4 px-4">
          <p className="text-xs sm:text-sm text-text-secondary mb-1">Gastos</p>
          <p className="text-lg sm:text-xl font-bold text-danger">-{formatCurrency(expenses)}</p>
        </CardContent>
      </Card>
      <Card
        className={`bg-gradient-to-br ${
          balance >= 0
            ? 'from-success/10 to-blue-500/5 border-success/20'
            : 'from-danger/10 to-danger/5 border-danger/20'
        }`}
      >
        <CardContent className="py-3 sm:py-4 px-4">
          <p className="text-xs sm:text-sm text-text-secondary mb-1">Balance</p>
          <p
            className={`text-lg sm:text-xl font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
