'use client'

import { Card, CardContent, Tabs, PeriodSelector } from '@/components/ui'
import { periodRange, toPeriod, toYearMonth, type Period } from '@/lib/period'
import { useAuth } from '@/hooks/useAuth'
import { useTransactionStats, useTransactionSummary } from '@/lib/queries/transactions'
import { EmptyAccountState } from '@/components/dashboard/EmptyAccountState'
import { useHasAnyTransactions } from '@/lib/queries/transactions'
import { useTransactionsStore } from '@/stores/transactionsStore'
import { LayoutDashboard, History, PiggyBank } from 'lucide-react'
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
  // The id stays 'investment': it is the tab remembered in the dashboard store
  { id: 'investment', label: 'Ahorro', icon: <PiggyBank className="h-4 w-4" /> },
]

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

  const { selectedYear, selectedMonth, setYear, setMonth } = useFiltersStore()

  const currentYear = new Date().getFullYear()

  const periodValue = toPeriod(
    selectedYear,
    selectedMonth,
    period === 'custom' ? { start: customStartDate, end: customEndDate } : null
  )

  const handlePeriodChange = (next: Period) => {
    const { year, month } = toYearMonth(next)
    setYear(year)
    setMonth(month)
    setPeriod(next.kind === 'range' ? 'custom' : next.kind)
    setCustomDates(next.kind === 'range' ? next.start : '', next.kind === 'range' ? next.end : '')
  }

  const { start: startDate, end: endDate } = periodRange(periodValue)

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
              // The history is yearly: it shows the year of the period, whatever the period is
              <PeriodSelector
                yearsOnly
                value={{ kind: 'year', year: selectedYear ?? currentYear }}
                onChange={handlePeriodChange}
              />
            ) : (
              <PeriodSelector value={periodValue} onChange={handlePeriodChange} />
            )
          }
        />
      </div>

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
                  <OverviewTab stats={stats} summary={summary} period={periodValue} />
                )}
              </Suspense>
            )}
            {activeTab === 'history' && (
              <Suspense fallback={<HistorySkeleton />}>
                <HistoryTab selectedYear={selectedYear ?? currentYear} initialData={initialData} />
              </Suspense>
            )}

            {activeTab === 'investment' && (
              <Suspense fallback={<DashboardSkeleton />}>
                {isLoading ? (
                  <DashboardSkeleton />
                ) : (
                  <SavingsTab stats={stats} period={periodValue} />
                )}
              </Suspense>
            )}
          </>
        )}
      </div>
    </div>
  )
}
