'use client'

import { useAuth } from '@/hooks/useAuth'
import { CategorySummary } from '@/lib/apiClient'
import { useTransactionStats } from '@/lib/queries/transactions'
import { CategoryPieChart } from '@/components/charts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import { MONTHS_ES } from '@/lib/constants'
import { TrendingDown, TrendingUp, Wallet, PieChart } from 'lucide-react'

interface OverviewTabProps {
  stats: {
    income: number
    expenses: number
    balance: number
  }
  summary: CategorySummary[]
  incomeByType?: Record<string, number>
}

export function OverviewTab({ stats, summary, incomeByType }: OverviewTabProps) {
  const { account } = useAuth()
  const { period, customStartDate, customEndDate } = useDashboardStore()
  const { selectedYear, selectedMonth } = useFiltersStore()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const getPreviousDateRange = () => {
    switch (period) {
      case 'month': {
        const monthNum = selectedMonth ?? currentMonth
        const yearNum = selectedYear ?? currentYear
        const prevMonth = monthNum === 0 ? 11 : monthNum - 1
        const prevYear = monthNum === 0 ? yearNum - 1 : yearNum

        return {
          startDate: new Date(prevYear, prevMonth, 1).toISOString().split('T')[0],
          endDate: new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0],
        }
      }
      case 'year': {
        const yNum = selectedYear ?? currentYear
        return {
          startDate: `${yNum - 1}-01-01`,
          endDate: `${yNum - 1}-12-31`,
        }
      }

      case 'all':
        return {
          startDate: '2019-01-01',
          endDate: '2019-12-31',
        }
    }
  }

  const prevRange = getPreviousDateRange()
  const prevStart = prevRange?.startDate || ''
  const prevEnd = prevRange?.endDate || ''

  const { data: prevStatsData } = useTransactionStats(account?.id || '', prevStart, prevEnd)

  const prevStats = prevStatsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const formatPeriodLabel = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    if (period === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      if (start.getTime() === end.getTime()) {
        return start.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      }
      const startStr = start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      const endStr = end.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
      return startStr + ' - ' + endStr
    }

    if (period === 'all') return 'Todos los tiempos'

    if (selectedMonth !== null) {
      return MONTHS_ES[selectedMonth] + ' ' + (selectedYear ?? currentYear)
    }

    if (selectedYear !== null) {
      return selectedYear === currentYear ? 'Año actual' : 'Año ' + selectedYear
    }

    if (period === 'year') {
      return 'Año actual'
    }

    return MONTHS_ES[currentMonth] + ' ' + currentYear
  }

  const StatCard = ({
    title,
    amount,
    type,
    icon: Icon,
  }: {
    title: string
    amount: number
    type: 'income' | 'expense' | 'balance'
    icon: React.ElementType
  }) => {
    const gradientClass =
      type === 'income'
        ? 'from-emerald-50/80 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/20'
        : type === 'expense'
          ? 'from-rose-50/80 to-red-50/50 dark:from-rose-950/30 dark:to-red-950/20'
          : amount >= 0
            ? 'from-blue-50/80 to-cyan-50/50 dark:from-blue-950/30 dark:to-cyan-950/20'
            : 'from-orange-50/80 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/20'

    const borderColor =
      type === 'income'
        ? 'border-emerald-200/50 dark:border-emerald-800/30'
        : type === 'expense'
          ? 'border-rose-200/50 dark:border-rose-800/30'
          : amount >= 0
            ? 'border-blue-200/50 dark:border-blue-800/30'
            : 'border-orange-200/50 dark:border-orange-800/30'

    const textClass =
      type === 'income'
        ? 'text-emerald-600 dark:text-emerald-400'
        : type === 'expense'
          ? 'text-rose-600 dark:text-rose-400'
          : amount >= 0
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-orange-600 dark:text-orange-400'

    const iconClass =
      type === 'income'
        ? 'text-emerald-500'
        : type === 'expense'
          ? 'text-rose-500'
          : amount >= 0
            ? 'text-blue-500'
            : 'text-orange-500'

    const formattedAmount = Math.abs(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    const sign = type === 'expense' ? '-' : amount >= 0 ? '+' : ''

    return (
      <Card className={`bg-gradient-to-br ${gradientClass} ${borderColor}`}>
        <CardContent className="py-4 px-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{title}</p>

          <p className={`text-lg sm:text-2xl font-bold ${textClass}`}>
            {sign}
            {formattedAmount} €
          </p>

          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
              <Icon className={`h-3 w-3 ${iconClass}`} />
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 text-muted-foreground">
              {formatPeriodLabel()}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const expensesByCategory = summary
    .filter((item) => Number(item.total_amount) < 0)
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

  const incomeColors = [
    '#22C55E',
    '#10B981',
    '#06B6D4',
    '#3B82F6',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#14B8A6',
  ]

  const incomeByCategory = incomeByType
    ? Object.entries(incomeByType)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .map((item, index) => ({
          ...item,
          color: incomeColors[index % incomeColors.length],
        }))
    : []

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
    const periodLabel = period === 'month' ? 'vs mes ant.' : 'vs año ant.'

    return (
      <div className="bg-layer-2 rounded-lg p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 items-center">
          <div className="text-left">
            <p className="text-base sm:text-lg font-semibold text-text-secondary">{title}</p>
            <p className="text-xs text-text-secondary hidden sm:block">Período</p>
            <p className="text-xs sm:text-sm font-medium text-accent">{formatPeriodLabel()}</p>
          </div>

          <div className="text-right">
            <p
              className={`text-xl sm:text-2xl ${type === 'income' ? 'text-success' : 'text-danger'}`}
            >
              <span className="text-text-secondary">{type === 'income' ? '+' : '-'}</span>
              <span className="ml-1 text-xl sm:text-2xl">
                {new Intl.NumberFormat('es-ES', {
                  style: 'decimal',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(current)}
              </span>
              <span className="text-text-secondary ml-1">€</span>
            </p>
            <div
              className={`flex items-center justify-end gap-1 mt-0.5 ${change.isPositive ? 'text-success' : 'text-danger'}`}
            >
              {change.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span className="text-xs sm:text-sm">
                <span className="text-text-secondary">{change.isPositive ? '+' : '-'}</span>
                <span className="ml-1">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(Math.abs(change.value))}
                </span>
                <span className="text-text-secondary ml-1">€</span>
              </span>
            </div>
            <span className="text-xs text-text-secondary">
              ({change.isPositive ? '+' : '-'}
              {change.percentage.toFixed(0)}% {periodLabel})
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <StatCard title="Ingresos" amount={stats.income} type="income" icon={TrendingUp} />
        <StatCard title="Gastos" amount={stats.expenses} type="expense" icon={TrendingDown} />
        <StatCard title="Balance" amount={stats.balance} type="balance" icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
      </div>
    </div>
  )
}
