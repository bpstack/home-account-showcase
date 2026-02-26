'use client'

import { Card, CardContent, Tabs, PageFilters } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useTransactionStats, useTransactionSummary } from '@/lib/queries/transactions'
import { HistoryInfoAlert } from '@/components/dashboard/HistoryInfoAlert'
import { OverviewInfoAlert } from '@/components/dashboard/OverviewInfoAlert'
import { EmptyAccountState } from '@/components/dashboard/EmptyAccountState'
import { useHasAnyTransactions } from '@/lib/queries/transactions'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { LayoutDashboard, History, LineChart, Coins } from 'lucide-react'
import type {
  StatsResponse,
  SummaryResponse,
  MonthlySummaryResponse,
  BalanceHistoryResponse,
} from '@/lib/api/types'

import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'

import { OverviewTab } from './components/OverviewTab'
import { HistoryTab } from './components/HistoryTab'
import { StatsTab } from './components/StatsTab'
import { SavingsTab } from './components/SavingsTab'

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
  const router = useRouter()

  const {
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    customStartDate,
    customEndDate,
    setCustomDates,
  } = useDashboardStore()

  const { setCreateModalOpen } = useTransactionsStore()
  const { data: hasAnyTransactions, isLoading: isLoadingCheck } = useHasAnyTransactions(
    account?.id || ''
  )

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
        {isLoadingCheck ? (
          <DashboardSkeleton />
        ) : !hasAnyTransactions ? (
          <EmptyAccountState
            onAddTransaction={() => {
              setCreateModalOpen(true)
              router.push('/transactions')
            }}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
