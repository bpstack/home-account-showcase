'use client'

import { Card, CardHeader, CardTitle, CardContent, Tabs, PageFilters } from '@/components/ui'
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
  LayoutDashboard,
  History,
  LineChart,
  Coins,
} from 'lucide-react'
import type {
  StatsResponse,
  SummaryResponse,
  MonthlySummaryResponse,
  BalanceHistoryResponse,
} from '@/lib/api/types'

import { InvestmentWidget } from '@/components/investment/InvestmentWidget'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import { MONTHS_ES } from '@/lib/constants'
import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'

// Initial data types from RSC
export interface DashboardInitialData {
  stats?: StatsResponse
  summary?: SummaryResponse
  monthlySummary?: MonthlySummaryResponse
  balanceHistory?: BalanceHistoryResponse
}

interface DashboardClientProps {
  initialData: DashboardInitialData
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-layer-2 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 gap-6">
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

const tabsList = [
  { id: 'overview', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'history', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  { id: 'stats', label: 'Estadísticas', icon: <LineChart className="h-4 w-4" /> },
  { id: 'investment', label: 'Inversión', icon: <Coins className="h-4 w-4" /> },
]

type Period = 'month' | 'year' | 'all' | 'custom'

interface Stats {
  income: number
  expenses: number
  balance: number
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const { account } = useAuth()

  const {
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    customStartDate,
    customEndDate,
    setCustomDates,
    reset: resetDashboard,
  } = useDashboardStore()

  const { selectedYear, selectedMonth, setYear, setMonth, reset: resetFilters } = useFiltersStore()

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const handleMonthChange = (month: number | null) => {
    setMonth(month)
    setPeriod(month === null ? 'year' : 'month')
  }

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setCustomDates(startDate, endDate)
    setPeriod('custom')
    // Exclusión mutua: al activar periodo, anulamos mes y año
    setYear(null)
    setMonth(null)
  }

  const getDateRange = () => {
    // Periodo custom tiene prioridad
    if (period === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      }
    }

    // Si hay mes seleccionado, calcular el rango del mes
    if (selectedMonth !== null) {
      const yearToUse = selectedYear ?? currentYear
      return {
        startDate: new Date(yearToUse, selectedMonth, 1).toISOString().split('T')[0],
        endDate: new Date(yearToUse, selectedMonth + 1, 0).toISOString().split('T')[0],
      }
    }

    // Si hay año seleccionado (sin mes), mostrar todo el año
    if (selectedYear !== null) {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
      }
    }

    // Fallback al period
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
          endDate: now.toISOString().split('T')[0],
        }
      default:
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
        }
    }
  }

  const hasActiveFilters =
    selectedMonth !== null ||
    (selectedYear !== null && selectedYear !== currentYear) ||
    period === 'custom'

  const clearFilters = () => {
    resetFilters() // Esto ya resetea a currentYear y month=null
    setPeriod('year')
    setCustomDates('', '')
  }

  const { startDate, endDate } = getDateRange()

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['transactions', 'stats', account?.id, startDate, endDate],
    queryFn: () => transactions.getStats(account!.id, startDate, endDate),
    enabled: !!account && !!startDate && !!endDate,
    initialData: initialData.stats,
  })

  const { data: summaryData } = useQuery({
    queryKey: ['transactions', 'summary', account?.id, startDate, endDate],
    queryFn: () => transactions.getSummary(account!.id, startDate, endDate),
    enabled: !!account,
    initialData: initialData.summary,
  })

  const summary = summaryData?.summary || []
  const stats: Stats = statsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const isLoading = isLoadingStats && !initialData.stats

  const dateRangeLabel = null // No more direct short range from URL

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 sm:px-4">
      {/* Tabs con línea inferior */}
      <div className="relative">
        <Tabs
          tabs={tabsList}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as any)}
          variant="underline-responsive"
          rightContent={
            activeTab !== 'investment' ? (
              <PageFilters
                showMonthSelect
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                showYearSelect
                year={selectedYear}
                onYearChange={(y) => {
                  setYear(y)
                  // El requisito dice: al elegir año se asigna "Todos" (null)
                  if (y !== null) setMonth(null)
                }}
                showDatePicker
                startDate={period === 'custom' ? customStartDate : undefined}
                endDate={period === 'custom' ? customEndDate : undefined}
                onDatesChange={handleDateRangeChange}
                showClear={hasActiveFilters}
                onClear={clearFilters}
                className="ml-auto"
              />
            ) : null
          }
        />

        {/* Mobile secondary filters could go here if needed, but PageFilters handles them in Tabs rightContent */}
      </div>

      {/* Content area */}
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {activeTab === 'overview' && (
          <Suspense fallback={<DashboardSkeleton />}>
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <OverviewTab
                stats={stats}
                summary={summary}
                incomeByType={statsData?.stats?.incomeByType}
              />
            )}
          </Suspense>
        )}
        {activeTab === 'history' && (
          <Suspense fallback={<HistorySkeleton />}>
            <HistoryTab selectedYear={selectedYear ?? currentYear} initialData={initialData} />
          </Suspense>
        )}

        {activeTab === 'stats' && (
          <Suspense fallback={<DashboardSkeleton />}>
            {isLoading ? <DashboardSkeleton /> : <StatsTab summary={summary} />}
          </Suspense>
        )}
        {activeTab === 'investment' && (
          <Suspense fallback={<DashboardSkeleton />}>
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <SavingsTab stats={stats} period={period} accountId={account?.id || ''} />
            )}
          </Suspense>
        )}
      </div>
    </div>
  )
}

function OverviewTab({
  stats,
  summary,
  incomeByType,
}: {
  stats: Stats
  summary: CategorySummary[]
  incomeByType?: Record<string, number>
}) {
  const { account } = useAuth()
  const { period } = useDashboardStore()
  const { selectedYear, selectedMonth } = useFiltersStore()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  const getPreviousDateRange = () => {
    switch (period) {
      case 'month':
        const monthNum = selectedMonth ?? currentMonth
        const yearNum = selectedYear ?? currentYear
        const prevMonth = monthNum === 0 ? 11 : monthNum - 1
        const prevYear = monthNum === 0 ? yearNum - 1 : yearNum

        return {
          startDate: new Date(prevYear, prevMonth, 1).toISOString().split('T')[0],
          endDate: new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'year':
        const yNum = selectedYear ?? currentYear
        return {
          startDate: `${yNum - 1}-01-01`,
          endDate: `${yNum - 1}-12-31`,
        }

      case 'all':
        return {
          startDate: '2019-01-01',
          endDate: '2019-12-31',
        }
    }
  }

  const prevRange = getPreviousDateRange()
  const prevStart = prevRange?.startDate
  const prevEnd = prevRange?.endDate

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

  // Paleta de colores para ingresos (subcategorias)
  const incomeColors = [
    '#22C55E', // green
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#EC4899', // pink
    '#14B8A6', // teal
  ]

  // Ingresos por tipo (usando datos detallados del endpoint stats)
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
          <span
            className={`text-2xl font-bold ${type === 'income' ? 'text-success' : 'text-danger'}`}
          >
            {type === 'income' ? '+' : '-'}
            {formatCurrency(current)}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 mt-1 ${change.isPositive ? 'text-success' : 'text-danger'}`}
        >
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
            ({change.isPositive ? '+' : '-'}
            {change.percentage.toFixed(1)}% vs {periodLabel})
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:border-success/30 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary font-medium">Ingresos</p>
                <p className="text-2xl font-bold text-success md:text-3xl">
                  +{formatCurrency(stats.income)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/20 flex items-center justify-center shadow-lg">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-danger/5 to-danger/10 border-danger/20 hover:border-danger/30 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary font-medium">Gastos</p>
                <p className="text-2xl font-bold text-danger md:text-3xl">
                  -{formatCurrency(stats.expenses)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-danger/20 flex items-center justify-center shadow-lg">
                <TrendingDown className="h-6 w-6 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br ${
            stats.balance >= 0
              ? 'from-success/5 to-blue-100/50 border-success/20 hover:border-success/30'
              : 'from-danger/5 to-red-100/50 border-danger/20 hover:border-danger/30'
          } transition-all`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary font-medium">Balance</p>
                <p
                  className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-success' : 'text-danger'} md:text-3xl`}
                >
                  {stats.balance >= 0 ? '+' : ''}
                  {formatCurrency(stats.balance)}
                </p>
              </div>
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg ${
                  stats.balance >= 0 ? 'bg-success/20' : 'bg-danger/20'
                }`}
              >
                <Wallet
                  className={`h-6 w-6 ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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

function HistoryTab({
  selectedYear,
  initialData,
}: {
  selectedYear: number
  initialData: DashboardInitialData
}) {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()

  const { data: monthlySummaryData, isLoading } = useQuery({
    queryKey: ['transactions', 'monthly-summary', account?.id, selectedYear],
    queryFn: () => transactions.getMonthlySummary(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
    initialData: selectedYear === currentYear ? initialData.monthlySummary : undefined,
  })

  const { data: balanceHistoryData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['transactions', 'balance-history', account?.id, selectedYear],
    queryFn: () => transactions.getBalanceHistory(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
    initialData: selectedYear === currentYear ? initialData.balanceHistory : undefined,
  })

  const chartData = monthlySummaryData?.monthlySummary || []
  const balanceData = balanceHistoryData?.balanceHistory || []

  const isLoadingMonthlySummary = isLoading && !initialData.monthlySummary
  const isLoadingBalanceHistory = isLoadingBalance && !initialData.balanceHistory

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
          {isLoadingMonthlySummary ? (
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
          {isLoadingBalanceHistory ? (
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
          {isLoadingMonthlySummary ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : chartData.length > 0 ? (
            <div className="space-y-3">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {chartData.map((item, index) => {
                      const balance = item.income - item.expenses
                      const hasData = item.income > 0 || item.expenses > 0
                      const isCurrentMonth =
                        index === new Date().getMonth() && selectedYear === currentYear

                      return (
                        <tr
                          key={item.month}
                          className={`border-b border-layer-2 hover:bg-layer-1 transition-colors ${isCurrentMonth ? 'bg-accent/5' : ''}`}
                        >
                          <td className="py-3 px-4 text-text-primary font-medium">
                            {MONTHS_ES[index]}
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

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {chartData.map((item, index) => {
                  const balance = item.income - item.expenses
                  const hasData = item.income > 0 || item.expenses > 0
                  const isCurrentMonth =
                    index === new Date().getMonth() && selectedYear === currentYear

                  return (
                    <div
                      key={item.month}
                      className={`rounded-lg border p-4 transition-colors ${isCurrentMonth ? 'border-accent/50 bg-accent/5' : 'border-layer-2 hover:bg-layer-1'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-text-primary">
                          {MONTHS_ES[index]}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-accent font-normal">(Actual)</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Ingresos</p>
                          <p className="font-semibold text-success">
                            {hasData ? `+${item.income.toFixed(2)}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Gastos</p>
                          <p className="font-semibold text-danger">
                            {hasData ? `-${item.expenses.toFixed(2)}` : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-text-secondary text-xs mb-1">Balance</p>
                          <p className={`font-semibold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                            {hasData ? `${balance >= 0 ? '+' : ''}${balance.toFixed(2)}` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
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

function SavingsTab({
  stats,
  period,
  accountId,
}: {
  stats: Stats
  period: Period
  accountId: string
}) {
  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

  const savingsRate = stats.income > 0 ? (stats.balance / stats.income) * 100 : 0

  const getSavingsLevel = (rate: number) => {
    if (rate >= 50)
      return {
        label: 'Excelente',
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      }
    if (rate >= 20)
      return {
        label: 'Bueno',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      }
    if (rate >= 0)
      return {
        label: 'Regular',
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      }
    return {
      label: 'Alto riesgo',
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    }
  }

  const savingsLevel = getSavingsLevel(savingsRate)
  const savingsAmount = Math.max(0, stats.balance)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Savings info (compact) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Quick stats - Ahorro principal + badges secundarios */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-emerald-50/50 dark:from-blue-950/30 dark:to-emerald-950/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="py-4 px-4 text-center">
            {/* Ahorro principal */}
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1">Ahorro mensual</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.balance >= 0 ? '+' : ''}{formatCurrency(savingsAmount)}
              </p>
            </div>
            {/* Tasa y Nivel en línea */}
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <TrendingUpIcon className="h-3 w-3 text-success" />
                <span className={savingsLevel.color}>{savingsRate.toFixed(1)}%</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 ${savingsLevel.color}`}>
                <Sparkles className="h-3 w-3" />
                {savingsLevel.label}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact breakdown */}
        <Card>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Desglose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-layer-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Ingresos</span>
              <span className="font-medium text-green-600">+{formatCurrency(stats.income)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-layer-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Gastos</span>
              <span className="font-medium text-red-600">-{formatCurrency(stats.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
              <span>Ahorro neto</span>
              <span className="text-blue-600 dark:text-blue-400">
                {stats.balance >= 0 ? '+' : ''}
                {formatCurrency(savingsAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact projections - Vertical on mobile, horizontal on desktop */}
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Proyección anual
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {/* Mobile: vertical list, Desktop: horizontal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">Ritmo actual</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  +{formatCurrency(savingsAmount * 12)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">Meta 30%</span>
                <span className="font-semibold text-green-600">
                  +{formatCurrency(stats.income * 0.3 * 12)}
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">Con inversión 5%</span>
                <span className="font-semibold text-primary">
                  +{formatCurrency(savingsAmount * 12 * 1.05)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column - Investment widget */}
      <div className="lg:col-span-1">
        <InvestmentWidget accountId={accountId} />
      </div>
    </div>
  )
}
