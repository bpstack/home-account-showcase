'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, Tabs, useActiveTab } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { transactions, CategorySummary, Transaction } from '@/lib/apiClient'
import { useTransactions } from '@/lib/queries/transactions'
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  PieChart,
  Calendar,
  BarChart3,
  Loader2,
} from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'monthly', label: 'Por meses' },
  { id: 'stats', label: 'Estadísticas' },
]

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

interface Stats {
  income: number
  expenses: number
  balance: number
}

export default function DashboardPage() {
  const activeTab = useActiveTab('tab', 'overview')
  const { account } = useAuth()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: txData, isLoading: isLoadingTx } = useTransactions({
    account_id: account?.id || '',
    start_date: startOfMonth,
    end_date: endOfMonth,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['transactions', 'summary', account?.id, startOfMonth, endOfMonth],
    queryFn: () => transactions.getSummary(account!.id, startOfMonth, endOfMonth),
    enabled: !!account,
  })

  const transactionList = txData?.transactions || []
  const summary = summaryData?.summary || []

  const stats: Stats = {
    income: transactionList
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0),
    expenses: transactionList
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0),
    balance: 0,
  }
  stats.balance = stats.income - stats.expenses

  const isLoading = isLoadingTx

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Tabs tabs={tabs} defaultTab="overview" className="mb-6" variant="pills" />

      {activeTab === 'overview' && (
        <OverviewTab stats={stats} summary={summary} transactions={transactionList} />
      )}
      {activeTab === 'monthly' && <MonthlyTab />}
      {activeTab === 'stats' && <StatsTab summary={summary} />}
    </div>
  )
}

function OverviewTab({
  stats,
  summary,
  transactions: txList,
}: {
  stats: Stats
  summary: CategorySummary[]
  transactions: Transaction[]
}) {
  const recentTransactions = txList.slice(0, 5)
  const totalExpenses = stats.expenses || 1

  const expensesByCategory = summary
    .reduce(
      (acc, item) => {
        const catName = item.category_name || 'Sin categoría'
        const existing = acc.find((e) => e.name === catName)
        if (existing) {
          existing.amount += Math.abs(Number(item.total_amount))
        } else {
          acc.push({
            name: catName,
            color: item.category_color || '#6B7280',
            amount: Math.abs(Number(item.total_amount)),
          })
        }
        return acc
      },
      [] as { name: string; color: string; amount: number }[]
    )
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Ingresos</p>
                <p className="text-2xl font-bold text-success">+{stats.income.toFixed(2)} €</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Gastos</p>
                <p className="text-2xl font-bold text-danger">-{stats.expenses.toFixed(2)} €</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Balance</p>
                <p
                  className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}
                >
                  {stats.balance >= 0 ? '+' : ''}
                  {stats.balance.toFixed(2)} €
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Gastos por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No hay gastos este mes</p>
            ) : (
              <div className="space-y-3">
                {expensesByCategory.slice(0, 5).map((item) => {
                  const percentage = (item.amount / totalExpenses) * 100
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-text-primary">{item.name}</span>
                          <span className="text-text-secondary">{item.amount.toFixed(2)} €</span>
                        </div>
                        <div className="mt-1 h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No hay transacciones este mes</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-layer-2 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full"
                        style={{ backgroundColor: tx.category_color || '#6B7280' }}
                      />
                      <div>
                        <p className="text-sm text-text-primary">{tx.description}</p>
                        <p className="text-xs text-text-secondary">{tx.date}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {Number(tx.amount) >= 0 ? '+' : ''}
                      {Number(tx.amount).toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MonthlyTab() {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const { data: yearlySummary, isLoading } = useQuery({
    queryKey: ['transactions', 'yearly', account?.id, selectedYear],
    queryFn: async () => {
      if (!account) return null

      const results = []
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(selectedYear, month, 1).toISOString().split('T')[0]
        const endDate = new Date(selectedYear, month + 1, 0).toISOString().split('T')[0]
        const res = await transactions.getSummary(account.id, startDate, endDate)
        results.push({ month, summary: res.summary })
      }
      return results as { month: number; summary: CategorySummary[] }[]
    },
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumen mensual {selectedYear}
            </CardTitle>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-layer-2 border border-layer-3 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {[currentYear - 1, currentYear].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : yearlySummary ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-layer-3">
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">Mes</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">
                      Ingresos
                    </th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">Gastos</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.map(({ month, summary }) => {
                    const income = summary
                      .filter((item: any) => Number(item.total_amount) > 0)
                      .reduce((sum: number, item: any) => sum + Number(item.total_amount), 0)
                    const expenses = summary
                      .filter((item: any) => Number(item.total_amount) < 0)
                      .reduce(
                        (sum: number, item: any) => sum + Math.abs(Number(item.total_amount)),
                        0
                      )
                    const balance = income - expenses
                    const hasData = income > 0 || expenses > 0
                    const isCurrentMonth =
                      month === new Date().getMonth() && selectedYear === currentYear

                    return (
                      <tr
                        key={months[month]}
                        className={`border-b border-layer-2 hover:bg-layer-1 ${isCurrentMonth ? 'bg-accent/5' : ''}`}
                      >
                        <td className="py-3 px-4 text-text-primary font-medium">
                          {months[month]}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-accent">(Actual)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-success">
                          {hasData ? `+${income.toFixed(2)} €` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-danger">
                          {hasData ? `-${expenses.toFixed(2)} €` : '-'}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium ${balance >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {hasData ? `${balance >= 0 ? '+' : ''}${balance.toFixed(2)} €` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-text-secondary">No hay datos disponibles</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsTab({ summary }: { summary: CategorySummary[] }) {
  const expensesByCategory = summary
    .reduce(
      (acc, item) => {
        const catName = item.category_name || 'Sin categoría'
        const existing = acc.find((e) => e.name === catName)
        if (existing) {
          existing.amount += Math.abs(Number(item.total_amount))
        } else {
          acc.push({
            name: catName,
            color: item.category_color || '#6B7280',
            amount: Math.abs(Number(item.total_amount)),
          })
        }
        return acc
      },
      [] as { name: string; color: string; amount: number }[]
    )
    .sort((a, b) => b.amount - a.amount)

  const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.amount, 0) || 1

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribución de gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByCategory.length === 0 ? (
            <p className="text-text-secondary text-center py-4">No hay gastos para mostrar</p>
          ) : (
            <div className="space-y-4">
              {expensesByCategory.map((item) => {
                const percentage = (item.amount / totalExpenses) * 100
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-primary font-medium">{item.name}</span>
                      <span className="text-text-secondary">
                        {item.amount.toFixed(2)} € ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-4 bg-layer-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {expensesByCategory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expensesByCategory.map((item) => {
            const percentage = (item.amount / totalExpenses) * 100
            return (
              <Card key={item.name} hover>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-text-primary">{item.name}</span>
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{item.amount.toFixed(2)} €</p>
                  <p className="text-sm text-text-secondary">{percentage.toFixed(1)}% del total</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
