'use client'

import { Suspense, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, Tabs, useActiveTab, Button, FilterSelect, DatePicker } from '@/components/ui'
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
  LayoutDashboard,
  History,
  LineChart,
  Coins,
  X,
} from 'lucide-react'
import type {
  StatsResponse,
  SummaryResponse,
  MonthlySummaryResponse,
  BalanceHistoryResponse,
} from '@/lib/api/types'

// Import InvestmentWidget
import { InvestmentWidget } from '@/components/investment/InvestmentWidget'

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

const tabsList = [
  { id: 'overview', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'history', label: 'Histórico', icon: <History className="h-4 w-4" /> },
  { id: 'stats', label: 'Estadísticas', icon: <LineChart className="h-4 w-4" /> },
  { id: 'investment', label: 'Inversión', icon: <Coins className="h-4 w-4" /> },
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

type Period = 'month' | 'year' | 'all' | 'custom'

interface Stats {
  income: number
  expenses: number
  balance: number
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
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

  const updateUrl = useCallback((updates: { 
    tab?: string; 
    period?: Period; 
    year?: number;
    month?: string | undefined;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString())

    // Rule 1: Cuando se selecciona Periodo (startDate/endDate), limpiar Mes y Año
    if (updates.startDate && updates.endDate) {
      params.delete('month')
      params.delete('year')
      params.set('startDate', updates.startDate)
      params.set('endDate', updates.endDate)
      params.set('period', 'custom')
    }
    // Rule 2 & 3: Los filtros Mes y Año pueden usarse complementariamente.
    // Cuando se selecciona "Todos los meses", se recupera el periodo anual.
    else {
      // Si se actualiza el mes (incluyendo ponerlo a undefined/all)
      if ('month' in updates) {
        if (updates.month) {
          params.set('month', updates.month)
          params.set('period', 'month')
        } else {
          params.delete('month')
          params.set('period', 'year')
        }
        // Limpiar periodo personalizado si se vuelve a filtros estándar
        params.delete('startDate')
        params.delete('endDate')
      }
      
      // Si se actualiza el año
      if ('year' in updates) {
        params.set('year', String(updates.year))
        // Limpiar periodo personalizado si se vuelve a filtros estándar
        params.delete('startDate')
        params.delete('endDate')
      }
    }
    
    if (updates.tab) params.set('tab', updates.tab)
    if (updates.period && !updates.startDate) params.set('period', updates.period)

    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const getDateRange = useCallback(() => {
    const month = searchParams.get('month')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (startDateParam && endDateParam) {
      // Period filter activated
      return {
        startDate: startDateParam,
        endDate: endDateParam
      }
    } else if (month && month !== 'all') {
      // Specific month selected
      const monthNum = parseInt(month)
      return {
        startDate: new Date(selectedYear, monthNum, 1).toISOString().split('T')[0],
        endDate: new Date(selectedYear, monthNum + 1, 0).toISOString().split('T')[0],
      }
    }

    // Default logic based on period param
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
  }, [period, searchParams, currentYear, currentMonth, selectedYear, now])

  // Verificar si hay filtros activos
  const hasActiveFilters = searchParams.get('month') ||
    searchParams.get('startDate') ||
    searchParams.get('endDate') ||
    (searchParams.get('year') && searchParams.get('year') !== String(currentYear))

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams()
    const currentTab = searchParams.get('tab')
    if (currentTab) params.set('tab', currentTab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const dateRangeResult = getDateRange()
  const startDate = dateRangeResult?.startDate || ''
  const endDate = dateRangeResult?.endDate || ''

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

  // Formato de fecha corto para móvil
  const getShortDateRange = () => {
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam)
      const end = new Date(endDateParam)
      return `${start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}`
    }
    return null
  }

  const dateRangeLabel = getShortDateRange()

  // Filtros para overview/stats/investment
  const overviewFilters = (
    <>
      <FilterSelect
        variant="tab"
        options={[
          { value: 'all', label: 'Todos' },
          ...months.map((month, index) => ({
            value: String(index),
            label: month
          }))
        ]}
        value={searchParams.get('month') || 'all'}
        onChange={(e) => {
          const selectedMonth = e.target.value
          updateUrl({
            month: selectedMonth === 'all' ? undefined : selectedMonth,
            period: selectedMonth === 'all' ? 'year' : 'month'
          })
        }}
        icon={<Calendar className="h-4 w-4" />}
      />

      <FilterSelect
        variant="tab"
        options={Array.from({ length: 11 }, (_, i) => {
          const year = currentYear - i
          return { value: String(year), label: String(year) }
        })}
        value={searchParams.get('year') || String(currentYear)}
        onChange={(e) => updateUrl({ year: parseInt(e.target.value) })}
      />

      <DatePicker
        variant="tab"
        startDate={searchParams.get('startDate') || undefined}
        endDate={searchParams.get('endDate') || undefined}
        onDatesChange={(startDate, endDate) => {
          const params = new URLSearchParams(searchParams.toString())
          params.delete('month')
          params.delete('year')
          params.set('startDate', startDate)
          params.set('endDate', endDate)
          params.set('period', 'custom')
          router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }}
      />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="py-3 px-2 text-muted-foreground hover:text-destructive transition-colors"
          title="Limpiar filtros"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </>
  )

  // Filtros para history
  const historyFilters = (
    <div className="flex items-center">
      <button
        onClick={() => updateUrl({ year: selectedYear - 1 })}
        className="py-3 px-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <span className="py-3 px-1 text-sm font-medium text-foreground min-w-[50px] text-center">
        {selectedYear}
      </span>
      <button
        onClick={() => updateUrl({ year: selectedYear + 1 })}
        className="py-3 px-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )

  // Determinar qué filtros mostrar según el tab activo
  const getRightContent = () => {
    if (activeTab === 'overview' || activeTab === 'stats' || activeTab === 'investment') {
      return overviewFilters
    }
    if (activeTab === 'history') {
      return historyFilters
    }
    return null
  }

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Tabs con filtros integrados */}
      <Tabs
        tabs={tabsList}
        defaultTab="overview"
        variant="underline-responsive"
        rightContent={getRightContent()}
      />

      {/* Date range indicator (mobile) - solo cuando hay rango seleccionado */}
      {dateRangeLabel && (
        <div className="md:hidden flex items-center justify-between px-4 py-2 bg-layer-2 border-t border-border">
          <span className="text-xs text-text-secondary">
            <Calendar className="h-3 w-3 inline mr-1" />
            {dateRangeLabel}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilters}
            className="h-6 w-6 text-text-secondary hover:text-danger hover:bg-danger/10"
            title="Limpiar filtros"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Content area */}
      <div className="px-4 md:px-6 py-6">

      {activeTab === 'overview' && (
        <Suspense fallback={<DashboardSkeleton />}>
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <OverviewTab 
              stats={stats} 
              summary={summary} 
              selectedYear={selectedYear}
              selectedMonth={searchParams.get('month') ? parseInt(searchParams.get('month')!) : null}
            />
          )}
        </Suspense>
      )}
      {activeTab === 'history' && (
        <Suspense fallback={<HistorySkeleton />}>
          <HistoryTab selectedYear={selectedYear} initialData={initialData} />
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
  selectedYear,
  selectedMonth,
}: {
  stats: Stats
  summary: CategorySummary[]
  selectedYear: number
  selectedMonth: number | null
}) {
  const { account } = useAuth()
  const searchParams = useSearchParams()
  const period = (searchParams.get('period') as Period) || 'month'

  const getPreviousDateRange = () => {
    switch (period) {
      case 'month':
        const sm = selectedMonth ?? new Date().getMonth()
        const sy = selectedYear
        const prevMonth = sm === 0 ? 11 : sm - 1
        const prevYear = sm === 0 ? sy - 1 : sy
        return {
          startDate: new Date(prevYear, prevMonth, 1).toISOString().split('T')[0],
          endDate: new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0],
        }
      case 'year':
        return {
          startDate: `${selectedYear - 1}-01-01`,
          endDate: `${selectedYear - 1}-12-31`,
        }
      case 'all':
        return {
          startDate: '2019-01-01',
          endDate: '2019-12-31',
        }
      case 'custom':
      default:
        return undefined
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

function HistoryTab({ selectedYear, initialData }: { selectedYear: number; initialData: DashboardInitialData }) {
  const { account } = useAuth()
  const currentYear = new Date().getFullYear()

  const { data: monthlySummaryData, isLoading } = useQuery({
    queryKey: ['transactions', 'monthly-summary', account?.id, selectedYear],
    queryFn: () => transactions.getMonthlySummary(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
    initialData: initialData.monthlySummary,
  })

  const { data: balanceHistoryData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['transactions', 'balance-history', account?.id, selectedYear],
    queryFn: () => transactions.getBalanceHistory(account!.id, selectedYear),
    enabled: !!account,
    staleTime: 5 * 60 * 1000,
    initialData: initialData.balanceHistory,
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
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

function SavingsTab({ stats, period, accountId }: { stats: Stats; period: Period; accountId: string }) {
  const formatCurrency = (value: number) => `${value.toFixed(2)} €`

  const savingsRate = stats.income > 0 ? (stats.balance / stats.income) * 100 : 0

  const getSavingsLevel = (rate: number) => {
    if (rate >= 50) return { label: 'Excelente', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' }
    if (rate >= 20) return { label: 'Bueno', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' }
    if (rate >= 0) return { label: 'Regular', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
    return { label: 'Alto riesgo', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' }
  }

  const savingsLevel = getSavingsLevel(savingsRate)
  const savingsAmount = Math.max(0, stats.balance)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Savings info (compact) */}
      <div className="lg:col-span-2 space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs text-muted-foreground">Ahorro Total</p>
              </div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.balance >= 0 ? '+' : ''}{formatCurrency(savingsAmount)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUpIcon className="h-4 w-4 text-success" />
                <p className="text-xs text-muted-foreground">Tasa</p>
              </div>
              <p className={`text-xl font-bold ${savingsLevel.color}`}>
                {savingsRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nivel</p>
              </div>
              <p className={`text-xl font-bold ${savingsLevel.color}`}>
                {savingsLevel.label}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Compact breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Desglose
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-layer-2 text-sm">
              <span className="text-muted-foreground">Ingresos</span>
              <span className="font-medium text-green-600">+{formatCurrency(stats.income)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-layer-2 text-sm">
              <span className="text-muted-foreground">Gastos</span>
              <span className="font-medium text-red-600">-{formatCurrency(stats.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-sm font-medium">
              <span>Ahorro neto</span>
              <span className="text-blue-600 dark:text-blue-400">
                {stats.balance >= 0 ? '+' : ''}{formatCurrency(savingsAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Compact projections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Proyección (año)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Ritmo actual</p>
                <p className="font-semibold text-blue-600 dark:text-blue-400">+{formatCurrency(savingsAmount * 12)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">30% recomendado</p>
                <p className="font-semibold text-green-600">+{formatCurrency(stats.income * 0.3 * 12)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Con inversión (5%)</p>
                <p className="font-semibold text-primary">+{formatCurrency(savingsAmount * 12 * 1.05)}</p>
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
