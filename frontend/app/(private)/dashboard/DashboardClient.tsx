'use client'

import { Card, CardHeader, CardTitle, CardContent, Tabs, PageFilters } from '@/components/ui'
import { Tooltip, InfoTooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/hooks/useAuth'
import { transactions, CategorySummary } from '@/lib/apiClient'
import {
  useTransactionStats,
  useTransactionSummary,
  useMonthlySummary,
  useBalanceHistory,
} from '@/lib/queries/transactions'
import { CategoryPieChart, MonthlyBarChart, BalanceLineChart } from '@/components/charts'
import { HistoryInfoAlert } from '@/components/dashboard/HistoryInfoAlert'
import { OverviewInfoAlert } from '@/components/dashboard/OverviewInfoAlert'
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
  ChevronDown,
  ChevronUp,
  ArrowLeft,
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
import { useState, useEffect, useMemo, Suspense } from 'react'

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
    // Exclusión mutua: al activar mes, anulamos periodo custom
    setCustomDates('', '')
  }

  const handleYearChange = (year: number | null) => {
    setYear(year)
    if (year !== null) {
      setMonth(null)
      // Exclusión mutua: al activar año, anulamos periodo custom
      setCustomDates('', '')
      setPeriod('year')
    }
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

  // Use client-side calculation hooks (work with encrypted data)
  const { data: statsData, isLoading: isLoadingStats } = useTransactionStats(
    account?.id || '',
    startDate,
    endDate,
    { initialData: initialData.stats }
  )

  const { data: summaryData } = useTransactionSummary(account?.id || '', startDate, endDate, {
    initialData: initialData.summary,
  })

  const summary = summaryData?.summary || []
  const stats: Stats = statsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const isLoading = isLoadingStats && !initialData.stats

  const dateRangeLabel = null // No more direct short range from URL

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Tabs con línea inferior */}
      <div className="relative">
        <Tabs
          tabs={tabsList}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as any)}
          variant="underline-responsive"
          rightContent={
            activeTab === 'history' ? (
              <PageFilters
                showYearSelect
                year={selectedYear}
                onYearChange={(y) => setYear(y)}
                showClear={selectedYear !== null && selectedYear !== currentYear}
                onClear={() => setYear(null)}
                className="ml-auto"
              />
            ) : (
              <PageFilters
                showMonthSelect
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                showYearSelect
                year={selectedYear}
                onYearChange={handleYearChange}
                showDatePicker
                startDate={period === 'custom' ? customStartDate : undefined}
                endDate={period === 'custom' ? customEndDate : undefined}
                onDatesChange={handleDateRangeChange}
                showClear={hasActiveFilters}
                onClear={clearFilters}
                className="ml-auto"
              />
            )
          }
        />

        {/* Mobile secondary filters could go here if needed, but PageFilters handles them in Tabs rightContent */}
      </div>

      {activeTab === 'overview' && (
        <div className="px-3 sm:px-4 mt-2">
          <OverviewInfoAlert />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="px-3 sm:px-4 mt-2">
          <HistoryInfoAlert />
        </div>
      )}

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
  const { period, customStartDate, customEndDate } = useDashboardStore()
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
  const prevStart = prevRange?.startDate || ''
  const prevEnd = prevRange?.endDate || ''

  // Use client-side calculation hook (works with encrypted data)
  const { data: prevStatsData } = useTransactionStats(account?.id || '', prevStart, prevEnd)

  const prevStats = prevStatsData?.stats || { income: 0, expenses: 0, balance: 0 }

  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

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
          {/* Title */}
          <p className="text-xs text-muted-foreground mb-1">{title}</p>

          {/* Amount */}
          <p className={`text-lg sm:text-2xl font-bold ${textClass}`}>
            {sign}
            {formattedAmount} €
          </p>

          {/* Footer: Icon + Period */}
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
                {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(current)}
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
                  {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(change.value))}
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

function HistoryTab({
  selectedYear,
  initialData,
}: {
  selectedYear: number
  initialData: DashboardInitialData
}) {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()

  // Use client-side calculation hooks (work with encrypted data)
  const { data: monthlySummaryData, isLoading } = useMonthlySummary(account?.id || '', selectedYear)

  const { data: balanceHistoryData, isLoading: isLoadingBalance } = useBalanceHistory(
    account?.id || '',
    selectedYear
  )

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
        <CardContent>
          {isLoadingBalanceHistory ? (
            <div className="py-12 flex items-center justify-center gap-2 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando datos...
            </div>
          ) : balanceData && balanceData.length > 0 ? (
            <BalanceLineChart data={balanceData} year={selectedYear} />
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
              <div className="hidden sm:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Mes
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Ingresos
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Gastos
                        </th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Balance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {chartData.map((item, index) => {
                        const balance = item.income - item.expenses
                        const hasData = item.income > 0 || item.expenses > 0
                        const isCurrentMonth =
                          index === new Date().getMonth() && selectedYear === currentYear

                        return (
                          <tr
                            key={item.month}
                            className={`hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors ${isCurrentMonth ? 'bg-accent/5' : ''}`}
                          >
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
                              {MONTHS_ES[index]}
                              {isCurrentMonth && (
                                <span className="ml-2 text-xs text-accent">(Actual)</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">+</span>
                              <span className="text-success text-sm">
                                {hasData ? item.income.toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">-</span>
                              <span className="text-danger text-sm">
                                {hasData ? item.expenses.toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-right">
                              <span className="text-text-secondary">
                                {hasData ? (balance >= 0 ? '+' : '-') : ''}
                              </span>
                              <span className={`text-sm ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                                {hasData ? Math.abs(balance).toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
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
                            <p>
                              <span className="text-text-secondary">+</span>
                              <span className="text-success text-sm ml-1">{hasData ? item.income.toFixed(2) : '-'}</span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-secondary text-xs mb-1">Gastos</p>
                            <p>
                              <span className="text-text-secondary">-</span>
                              <span className="text-danger text-sm ml-1">{hasData ? item.expenses.toFixed(2) : '-'}</span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-text-secondary text-xs mb-1">Balance</p>
                            <p>
                              <span className="text-text-secondary">
                                {hasData ? (balance >= 0 ? '+' : '-') : ''}
                              </span>
                              <span className={`text-sm ml-1 ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                                {hasData ? Math.abs(balance).toFixed(2) : '-'}
                              </span>
                              {hasData && <span className="text-text-secondary ml-1">€</span>}
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [drillCategory, setDrillCategory] = useState<string | null>(null)

  const fmt = (v: number) =>
    new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

  const categoriesWithSubs = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number; subcategories: { name: string; amount: number; count: number }[] }>()
    for (const item of summary) {
      const catName = item.category_name || 'Sin categoría'
      const amt = Math.abs(Number(item.total_amount))
      let cat = map.get(catName)
      if (!cat) {
        cat = { name: catName, color: item.category_color || '#6B7280', amount: 0, subcategories: [] }
        map.set(catName, cat)
      }
      cat.amount += amt
      if (item.subcategory_name) {
        cat.subcategories.push({ name: item.subcategory_name, amount: amt, count: item.transaction_count })
      }
    }
    const result = Array.from(map.values())
    result.sort((a, b) => b.amount - a.amount)
    for (const cat of result) {
      cat.subcategories.sort((a, b) => b.amount - a.amount)
    }
    return result
  }, [summary])

  const totalExpenses = categoriesWithSubs.reduce((sum, item) => sum + item.amount, 0) || 1

  const drillData = drillCategory ? categoriesWithSubs.find((c) => c.name === drillCategory) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribución de ingresos y gastos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesWithSubs.length === 0 ? (
            <p className="text-text-secondary text-center py-4">No hay gastos para mostrar</p>
          ) : (
            <div className="space-y-4">
              {categoriesWithSubs.map((item) => {
                const percentage = (item.amount / totalExpenses) * 100
                const isExpanded = expandedCategory === item.name
                const hasSubs = item.subcategories.length > 0
                return (
                  <div key={item.name}>
                    <div
                      className={`flex justify-between text-sm mb-1 ${hasSubs ? 'cursor-pointer' : ''}`}
                      onClick={() => hasSubs && setExpandedCategory(isExpanded ? null : item.name)}
                    >
                      <span className="text-text-primary font-medium flex items-center gap-1">
                        {item.name}
                        {hasSubs && (isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5 text-text-secondary" />
                          : <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
                        )}
                      </span>
                      <span className="text-text-secondary">
                        {fmt(item.amount)} € ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-4 bg-layer-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                    {isExpanded && (
                      <div className="ml-4 mt-2 space-y-2">
                        {item.subcategories.map((sub) => {
                          const subPct = (sub.amount / item.amount) * 100
                          return (
                            <div key={sub.name}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="text-text-secondary">{sub.name}</span>
                                <span className="text-text-secondary">
                                  {fmt(sub.amount)} € ({subPct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-2.5 bg-layer-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${subPct}%`, backgroundColor: item.color, opacity: 0.7 }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {categoriesWithSubs.length > 0 && !drillData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoriesWithSubs.map((item) => {
            const percentage = (item.amount / totalExpenses) * 100
            const hasSubs = item.subcategories.length > 0
            return (
              <Card
                key={item.name}
                hover
                className={hasSubs ? 'cursor-pointer' : ''}
                onClick={() => hasSubs && setDrillCategory(item.name)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-text-primary">{item.name}</span>
                    {hasSubs && <ChevronDown className="h-4 w-4 text-text-secondary ml-auto" />}
                  </div>
                  <p className="text-2xl font-bold text-text-primary">
                    {fmt(item.amount)} <span className="text-text-secondary text-lg font-normal">€</span>
                  </p>
                  <p className="text-sm text-text-secondary">{percentage.toFixed(1)}% del total</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {drillData && (
        <div>
          <button
            onClick={() => setDrillCategory(null)}
            className="flex items-center gap-2 mb-4 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: drillData.color }} />
            <span className="font-medium">{drillData.name}</span>
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drillData.subcategories.map((sub) => {
              const subPct = (sub.amount / drillData.amount) * 100
              return (
                <Card key={sub.name} hover>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: drillData.color, opacity: 0.7 }} />
                      <span className="font-medium text-text-primary">{sub.name}</span>
                    </div>
                    <p className="text-2xl font-bold text-text-primary">
                      {fmt(sub.amount)} <span className="text-text-secondary text-lg font-normal">€</span>
                    </p>
                    <div className="flex justify-between text-sm text-text-secondary">
                      <span>{subPct.toFixed(1)}% de la categoría</span>
                      <span>{sub.count} transacciones</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
              <div className="text-xs text-muted-foreground mb-1">
                Ahorro mensual
              </div>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                <span className="text-text-secondary">{stats.balance >= 0 ? '+' : '-'}</span>
                <span className="ml-1">
                  {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(savingsAmount))}
                </span>
                <span className="text-text-secondary ml-1">EUR</span>
              </p>
            </div>
            {/* Tasa y Nivel en linea */}
            <div className="flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40">
                <TrendingUpIcon className="h-3 w-3 text-success" />
                <span className={savingsLevel.color}>{savingsRate.toFixed(1)}%</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/70 dark:bg-white/10 border border-border/40 ${savingsLevel.color}`}
              >
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
              <span>
                <span className="text-text-secondary">+</span>
                <span className="text-success ml-1">{formatCurrency(stats.income)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 border-b border-layer-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Gastos</span>
              <span>
                <span className="text-text-secondary">-</span>
                <span className="text-danger ml-1">{formatCurrency(stats.expenses)}</span>
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
              <span>Ahorro neto</span>
              <span>
                <span className="text-text-secondary">{stats.balance >= 0 ? '+' : '-'}</span>
                <span className={`ml-1 ${stats.balance >= 0 ? 'text-success' : 'text-danger'}`}>
                  {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(savingsAmount))}
                </span>
                <span className="text-text-secondary ml-1">€</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact projections - Vertical on mobile, horizontal on desktop */}
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {period === 'year' || period === 'all' ? 'Año completo' : 'Proyección anual'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {/* Mobile: vertical list, Desktop: horizontal */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">
                  {period === 'year' || period === 'all' ? 'Total ahorrado' : 'Ritmo actual'}
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                      period === 'year' || period === 'all' ? savingsAmount : savingsAmount * 12
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">
                  Objetivo 30%
                </span>
                <span className="font-semibold text-green-600">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                      period === 'year' || period === 'all' ? stats.income * 0.3 : stats.income * 0.3 * 12
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:text-center">
                <span className="text-xs text-muted-foreground">
                  Con inversión 5%
                </span>
                <span className="font-semibold text-primary">
                  <span className="text-text-secondary">+</span>
                  <span className="ml-1">
                    {new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                      period === 'year' || period === 'all' 
                        ? savingsAmount * 1.05 
                        : savingsAmount * 12 * 1.05
                    )}
                  </span>
                  <span className="text-text-secondary ml-1">€</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column - Investment widget */}
      <div className="lg:col-span-1">
        <InvestmentWidget accountId={accountId} stats={stats} />
      </div>
    </div>
  )
}
