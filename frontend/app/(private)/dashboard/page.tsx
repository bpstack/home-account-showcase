'use client'

import { Suspense, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, Tabs, useActiveTab, Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { transactions, CategorySummary } from '@/lib/apiClient'
import { CategoryPieChart, MonthlyBarChart, BalanceLineChart } from '@/components/charts'
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  PieChart,
  Calendar,
  BarChart3,
  Loader2,
  PiggyBank,
  TrendingUpIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-layer-2 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="h-64 bg-layer-2 rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-64 bg-layer-2 rounded" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card>
        <CardContent className="pt-6">
          <div className="h-80 bg-layer-2 rounded" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="h-80 bg-layer-2 rounded" />
        </CardContent>
      </Card>
    </div>
  )
}

const tabs = [
  { id: 'overview', label: 'Resumen' },
  { id: 'history', label: 'Histórico' },
  { id: 'stats', label: 'Estadísticas' },
  { id: 'savings', label: 'Ahorro e Inversión' },
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

type Period = 'month' | 'year' | 'all'

interface Stats {
  income: number
  expenses: number
  balance: number
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { account } = useAuth()

  const activeTab = useActiveTab('tab', 'overview')
  const period = (searchParams.get('period') as Period) || 'month'
  const selectedYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const updateUrl = useCallback((updates: { tab?: string; period?: Period; year?: number }) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (updates.tab) params.set('tab', updates.tab)
    if (updates.period) params.set('period', updates.period)
    if (updates.year !== undefined) params.set('year', String(updates.year))
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'month':
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'year':
        return {
          startDate: `${selectedYear}-01-01`,
          endDate: `${selectedYear}-12-31`,
        }
      case 'all':
        return {
          startDate: '2020-01-01',
          endDate: now.toISOString().split('T')[0],
        }
    }
  }, [period, currentYear, currentMonth, selectedYear, now])

  const { startDate, endDate } = getDateRange()

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['transactions', 'stats', account?.id, startDate, endDate],
    queryFn: () => transactions.getStats(account!.id, startDate, endDate),
    enabled: !!account,
  })

const { data: summaryData } = useQuery({
    queryKey: ['transactions', 'summary', account?.id, startDate, endDate],
    queryFn: () => transactions.getSummary(account!.id, startDate, endDate),
    enabled: !!account,
  })

  const summary = summaryData?.summary || []
  const stats: Stats = statsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const isLoading = isLoadingStats

  const formatPeriodLabel = () => {
    switch (period) {
      case 'month':
        return `${months[currentMonth]} ${currentYear}`
      case 'year':
        return String(selectedYear)
      case 'all':
        return 'Todos los datos'
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} defaultTab="overview" className="mb-0" variant="pills" />

        <div className="flex items-center gap-2">
          {(activeTab === 'overview' || activeTab === 'stats' || activeTab === 'savings') && (
            <>
              <Button
                variant={period === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateUrl({ period: 'month' })}
              >
                Mes
              </Button>
              <Button
                variant={period === 'year' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateUrl({ period: 'year' })}
              >
                Año
              </Button>
              <Button
                variant={period === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateUrl({ period: 'all' })}
              >
                Todo
              </Button>
              {period === 'year' && (
                <>
                  <div className="w-px h-6 bg-layer-3 mx-1" />
                  <Button variant="ghost" size="icon" onClick={() => updateUrl({ year: selectedYear - 1 })}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-text-primary min-w-[60px] text-center">
                    {selectedYear}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => updateUrl({ year: selectedYear + 1 })}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => updateUrl({ year: selectedYear - 1 })}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-text-primary min-w-[100px] text-center">
                {selectedYear}
              </span>
              <Button variant="ghost" size="icon" onClick={() => updateUrl({ year: selectedYear + 1 })}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary text-center mb-4">
        {formatPeriodLabel()}
      </p>

      {activeTab === 'overview' && (
        <Suspense fallback={<DashboardSkeleton />}>
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <OverviewTab stats={stats} summary={summary} />
          )}
        </Suspense>
      )}
      {activeTab === 'history' && (
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryTab selectedYear={selectedYear} />
        </Suspense>
      )}
      {activeTab === 'stats' && (
        <Suspense fallback={<DashboardSkeleton />}>
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <StatsTab summary={summary} />
          )}
        </Suspense>
      )}
      {activeTab === 'savings' && (
        <Suspense fallback={<DashboardSkeleton />}>
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <SavingsTab stats={stats} period={period} />
          )}
        </Suspense>
      )}
    </div>
  )
}

function OverviewTab({
  stats,
  summary,
}: {
  stats: Stats
  summary: CategorySummary[]
}) {
  const { account } = useAuth()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as Period) || 'month'
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const getPreviousDateRange = () => {
    switch (period) {
      case 'month':
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return {
          startDate: new Date(prevYear, prevMonth, 1).toISOString().split('T')[0],
          endDate: new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'year':
        return {
          startDate: `${currentYear - 1}-01-01`,
          endDate: `${currentYear - 1}-12-31`,
        }
      case 'all':
        return {
          startDate: '2019-01-01',
          endDate: '2019-12-31',
        }
    }
  }

  const { startDate: currentStart, endDate: currentEnd } = (() => {
    switch (period) {
      case 'month':
        return {
          startDate: new Date(currentYear, currentMonth, 1).toISOString().split('T')[0],
          endDate: new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'year':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
        }
      case 'all':
        return {
          startDate: '2020-01-01',
          endDate: new Date().toISOString().split('T')[0],
        }
    }
  })()

  const { startDate: prevStart, endDate: prevEnd } = getPreviousDateRange()

  const { data: prevStatsData } = useQuery({
    queryKey: ['transactions', 'stats', account?.id, prevStart, prevEnd],
    queryFn: () => transactions.getStats(account!.id, prevStart, prevEnd),
    enabled: !!account,
  })

  const prevStats = prevStatsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, percentage: 0, isPositive: current > 0 }
    const change = current - previous
    const percentage = (change / Math.abs(previous)) * 100
    return {
      value: change,
      percentage: Math.abs(percentage),
      isPositive: change >= 0,
    }
  }

  const incomeChange = calculateChange(stats.income, prevStats.income)
  const expensesChange = calculateChange(stats.expenses, prevStats.expenses)

  const expensesByCategory = summary
    .filter(item => Number(item.total_amount) < 0)
    .reduce(
      (acc, item) => {
        const catName = item.category_name || 'Sin categoría'
        const existing = acc.find((e) => e.name === catName)
        if (existing) {
          existing.value += Math.abs(Number(item.total_amount))
        } else {
          acc.push({
            name: catName,
            color: item.category_color || '#6B7280',
            value: Math.abs(Number(item.total_amount)),
          })
        }
        return acc
      },
      [] as { name: string; color: string; value: number }[]
    )
    .sort((a, b) => b.value - a.value)

  const incomeByCategory = summary
    .filter(item => Number(item.total_amount) > 0)
    .reduce(
      (acc, item) => {
        const catName = item.category_name || 'Sin categoría'
        const existing = acc.find((e) => e.name === catName)
        if (existing) {
          existing.value += Number(item.total_amount)
        } else {
          acc.push({
            name: catName,
            color: item.category_color || '#22C55E',
            value: Number(item.total_amount),
          })
        }
        return acc
      },
      [] as { name: string; color: string; value: number }[]
    )
    .sort((a, b) => b.value - a.value)

  const ComparisonCard = ({
    title,
    current,
    previous,
    type,
  }: {
    title: string
    current: number
    previous: number
    type: 'income' | 'expense'
  }) => {
    const change = calculateChange(current, previous)
    const periodLabel = period === 'month' ? 'mes anterior' : 'año anterior'

    return (
      <div className="bg-layer-2 rounded-lg p-4">
        <p className="text-sm text-text-secondary mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${type === 'income' ? 'text-success' : 'text-danger'}`}>
            {type === 'income' ? '+' : '-'}{formatCurrency(current)}
          </span>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${change.isPositive ? 'text-success' : 'text-danger'}`}>
          {change.isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {change.isPositive ? '+' : '-'}
            {formatCurrency(Math.abs(change.value))}
          </span>
          <span className="text-xs text-text-secondary">
            ({change.isPositive ? '+' : '-'}{change.percentage.toFixed(1)}% vs {periodLabel})
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Ingresos</p>
                <p className="text-2xl font-bold text-success">+{formatCurrency(stats.income)}</p>
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
                <p className="text-2xl font-bold text-danger">-{formatCurrency(stats.expenses)}</p>
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
                  {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
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
            <div className="mb-4">
              <ComparisonCard
                title="Total Gastos"
                current={stats.expenses}
                previous={prevStats.expenses}
                type="expense"
              />
            </div>
            {expensesByCategory.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No hay gastos</p>
            ) : (
              <CategoryPieChart data={expensesByCategory} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Ingresos por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <ComparisonCard
                title="Total Ingresos"
                current={stats.income}
                previous={prevStats.income}
                type="income"
              />
            </div>
            {incomeByCategory.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No hay ingresos</p>
            ) : (
              <CategoryPieChart data={incomeByCategory} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function HistoryTab({ selectedYear }: { selectedYear: number }) {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()

  const { data: monthlySummaryData, isLoading } = useQuery({
    queryKey: ['transactions', 'monthly-summary', account?.id, selectedYear],
    queryFn: () => transactions.getMonthlySummary(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
  })

  const { data: balanceHistoryData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['transactions', 'balance-history', account?.id, selectedYear],
    queryFn: () => transactions.getBalanceHistory(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
  })

  const chartData = monthlySummaryData?.monthlySummary || []
  const balanceData = balanceHistoryData?.balanceHistory || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Ingresos vs Gastos - {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : (
            <MonthlyBarChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolución del balance - {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBalance ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : balanceData && balanceData.length > 0 ? (
            <BalanceLineChart data={balanceData} />
          ) : (
            <div className="py-12 text-center text-text-secondary">
              No hay transacciones suficientes para mostrar
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumen mensual {selectedYear}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : chartData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-layer-3">
                    <th className="text-left py-3 px-4 text-text-secondary font-medium">Mes</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">Ingresos</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">Gastos</th>
                    <th className="text-right py-3 px-4 text-text-secondary font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((item, index) => {
                    const balance = item.income - item.expenses
                    const hasData = item.income > 0 || item.expenses > 0
                    const isCurrentMonth =
                      index === new Date().getMonth() && selectedYear === currentYear

                    return (
                      <tr
                        key={item.month}
                        className={`border-b border-layer-2 hover:bg-layer-1 ${isCurrentMonth ? 'bg-accent/5' : ''}`}
                      >
                        <td className="py-3 px-4 text-text-primary font-medium">
                          {months[index]}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-accent">(Actual)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-success">
                          {hasData ? `+${item.income.toFixed(2)} €` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-danger">
                          {hasData ? `-${item.expenses.toFixed(2)} €` : '-'}
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

function SavingsTab({ stats, period }: { stats: Stats; period: Period }) {
  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

  const savingsRate = stats.income > 0 ? (stats.balance / stats.income) * 100 : 0

  const getSavingsLevel = (rate: number) => {
    if (rate >= 50) return { label: 'Excelente', color: 'text-success', bg: 'bg-success/10' }
    if (rate >= 20) return { label: 'Bueno', color: 'text-accent', bg: 'bg-accent/10' }
    if (rate >= 0) return { label: 'Regular', color: 'text-warning', bg: 'bg-warning/10' }
    return { label: 'Alto riesgo', color: 'text-danger', bg: 'bg-danger/10' }
  }

  const savingsLevel = getSavingsLevel(savingsRate)
  const savingsAmount = Math.max(0, stats.balance)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Ahorro Total</p>
                <p className="text-2xl font-bold text-accent">
                  {stats.balance >= 0 ? '+' : ''}{formatCurrency(savingsAmount)}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Ingresos - Gastos
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <PiggyBank className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Tasa de Ahorro</p>
                <p className={`text-2xl font-bold ${savingsLevel.color}`}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full ${savingsLevel.bg} flex items-center justify-center`}>
                <TrendingUpIcon className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Nivel</p>
                <p className={`text-2xl font-bold ${savingsLevel.color}`}>
                  {savingsLevel.label}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-layer-2 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5" />
            Desglose de Ahorro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Ingresos</span>
              <span className="font-medium text-success">+{formatCurrency(stats.income)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Gastos</span>
              <span className="font-medium text-danger">-{formatCurrency(stats.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-layer-3 bg-accent/5 px-4 -mx-4 rounded">
              <span className="text-text-primary font-medium">Ahorro (Ingresos - Gastos)</span>
              <span className="font-bold text-accent">
                {stats.balance >= 0 ? '+' : ''}{formatCurrency(savingsAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Ahorro proyectado (año)</span>
              <span className="font-medium text-accent">
                +{formatCurrency(savingsAmount * 12)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Meta de ahorro (30%)</span>
              <span className="font-medium text-success">
                +{formatCurrency(stats.income * 0.3)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-text-secondary">Diferencia con meta</span>
              <span
                className={`font-medium ${stats.balance >= stats.income * 0.3 ? 'text-success' : 'text-danger'}`}
              >
                {formatCurrency(stats.balance - stats.income * 0.3)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inversión
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Ahorro disponible</span>
              <span className="font-medium text-accent">
                {stats.balance >= 0 ? formatCurrency(savingsAmount) : 'Sin ahorro'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-layer-2">
              <span className="text-text-secondary">Porcentaje a invertir</span>
              <span className="font-medium text-text-primary">0% (pendiente IA)</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-text-secondary">Monto a invertir</span>
              <span className="font-medium text-text-secondary">-</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-layer-2 rounded-lg border border-layer-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary mb-2">
                  Cálculo de inversión con IA
                </p>
                <p className="text-xs text-text-secondary mb-2">
                  La IA analizará tus datos para determinar el % óptimo de inversión:
                </p>
                <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                  <li>Perfil de riesgo (conservador, moderado, agresivo)</li>
                  <li>Horizonte temporal (corto, medio, largo plazo)</li>
                  <li>Objetivos financieros (jubilación, casa, emergencia)</li>
                  <li>Cantidad disponible vs necesidades</li>
                </ul>
                <p className="text-xs text-text-secondary mt-2">
                  Referencias: OpenAI GPT-4, Claude API
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Proyección de Ahorro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-layer-2">
              <span className="text-text-secondary">Manteniendo ritmo actual</span>
              <span className="font-medium text-accent">
                +{formatCurrency(savingsAmount * 12)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-layer-2">
              <span className="text-text-secondary">Ahorro recomendado (30%)</span>
              <span className="font-medium text-success">
                +{formatCurrency(stats.income * 0.3 * 12)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-layer-2">
              <span className="text-text-secondary">Proyección conservadora (5%)</span>
              <span className="font-medium text-text-primary">
                +{formatCurrency(savingsAmount * 12 * 1.05)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-text-secondary">Proyección optimista (10%)</span>
              <span className="font-medium text-success">
                +{formatCurrency(savingsAmount * 12 * 1.1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
