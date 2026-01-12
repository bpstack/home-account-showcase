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
  const balance = totals.income - totals.expenses

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-text-secondary">Ingresos</p>
          <p className="text-lg font-semibold text-success">+{totals.income.toFixed(2)} €</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-text-secondary">Gastos</p>
          <p className="text-lg font-semibold text-danger">-{totals.expenses.toFixed(2)} €</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-text-secondary">Balance</p>
          <p
            className={`text-lg font-semibold ${balance >= 0 ? 'text-success' : 'text-danger'}`}
          >
            {balance.toFixed(2)} €
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
