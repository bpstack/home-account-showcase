'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTransactionStats, useTransactions } from '@/lib/queries/transactions'
import { useTransactionSummary } from '@/lib/queries/transactions'
import { Card, CardHeader, CardContent, Tabs, PageFilters } from '@/components/ui'
import { CategoryChangeModal } from '@/components/transactions'
import { BalanceTab } from './components/BalanceTab'
import { IncomeTab } from './components/IncomeTab'
import { ExpensesTab } from './components/ExpensesTab'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Transaction } from '@/lib/apiClient'
import { useBalanceStore } from '@/stores/balanceStore'
import { useFiltersStore } from '@/stores/filtersStore'

const monthsFull = [
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

// Tabs definidos fuera del componente para evitar recrearlos en cada render
const balanceTabs = [
  { id: 'balance', label: 'Balance', icon: <Wallet className="h-4 w-4" /> },
  { id: 'income', label: 'Ingresos', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'expenses', label: 'Gastos', icon: <TrendingDown className="h-4 w-4" /> },
]

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PAGE_SIZE = 50

interface PeriodStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
  incomeByType: Record<string, number>
}

const emptyStats: PeriodStats = {
  income: 0,
  expenses: 0,
  balance: 0,
  transactionCount: 0,
  incomeByType: {},
}

interface BalanceClientProps {
  initialStats?: PeriodStats
  initialTransactions?: Transaction[]
  initialTotal?: number
  initialExpensesByCategory?: { name: string; color: string; amount: number }[]
  initialIncomeByCategory?: { name: string; color: string; amount: number }[]
}

import { Skeleton } from '@/components/ui/Skeleton'

function BalanceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="py-4 px-4 text-center space-y-3">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-8 w-28 mx-auto" />
              <Skeleton className="h-6 w-24 mx-auto rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BalancePageFallback() {
  return <BalanceSkeleton />
}

export default function BalanceClient(props: BalanceClientProps) {
  return (
    <Suspense fallback={<BalancePageFallback />}>
      <BalanceContent {...props} />
    </Suspense>
  )
}

function BalanceContent({
  initialStats,
  initialTransactions,
  initialTotal,
  initialExpensesByCategory,
  initialIncomeByCategory,
}: BalanceClientProps) {
  const { account } = useAuth()

  // Usar stores de Zustand como fuente de verdad
  const { selectedYear, selectedMonth, setYear, setMonth, reset: resetFilters } = useFiltersStore()
  const {
    activeTab,
    period,
    customStartDate,
    customEndDate,
    setActiveTab,
    setPeriod,
    setCustomDates,
    reset: resetBalance,
  } = useBalanceStore()

  const hasActiveFilters =
    selectedMonth !== null ||
    selectedYear !== new Date().getFullYear() ||
    period !== 'monthly' ||
    activeTab !== 'balance'

  const clearFilters = () => {
    resetFilters()
    resetBalance()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const getPeriodLabel = () => {
    switch (period) {
      case 'monthly':
        return `${monthsFull[selectedMonth ?? new Date().getMonth()]} ${selectedYear}`
      case 'yearly':
        return `Año ${selectedYear}`
      case 'custom':
        if (!customStartDate || !customEndDate) return 'Período personalizado'
        {
          const start = new Date(customStartDate)
          const end = new Date(customEndDate)
          return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`
        }
      default:
        return ''
    }
  }

  const [page, setPage] = useState(1)
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'monthly': {
        const yearToUse = selectedYear ?? new Date().getFullYear()
        if (selectedMonth === null) {
          return {
            startDate: `${yearToUse}-01-01`,
            endDate: `${yearToUse}-12-31`,
          }
        }
        return {
          startDate: formatLocalDate(new Date(yearToUse, selectedMonth, 1)),
          endDate: formatLocalDate(new Date(yearToUse, selectedMonth + 1, 0)),
        }
      }

      case 'yearly': {
        const yToUse = selectedYear ?? new Date().getFullYear()
        return {
          startDate: `${yToUse}-01-01`,
          endDate: `${yToUse}-12-31`,
        }
      }

      case 'custom':
        return {
          startDate: customStartDate || '',
          endDate: customEndDate || '',
        }
    }
  }, [period, selectedYear, selectedMonth, customStartDate, customEndDate])

  const { startDate, endDate } = useMemo(() => getDateRange(), [getDateRange])

  // Calculate type filter directly based on activeTab
  const typeFilter: 'income' | 'expense' | undefined =
    activeTab === 'income' ? 'income' : activeTab === 'expenses' ? 'expense' : undefined

  const { data: statsData, isLoading: isLoadingStats } = useTransactionStats(
    account?.id || '',
    startDate,
    endDate,
    {
      initialData: initialStats ? { success: true, stats: initialStats } : undefined,
    }
  )

  // Derive stats directly from hook data (avoids infinite loop from useEffect)
  const stats = statsData?.stats || initialStats || emptyStats

  const { data: summaryData } = useTransactionSummary(account?.id || '', startDate, endDate)

  // Server filters by amount_sign (metadata, not encrypted)
  // This works with E2E encryption because amount_sign is stored unencrypted
  const { data: txData, isLoading: isLoadingTx } = useTransactions(
    {
      account_id: account?.id || '',
      start_date: startDate,
      end_date: endDate,
      type: typeFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
    {
      staleTime: 30_000,
      initialData:
        initialTransactions && page === 1 && !hasActiveFilters
          ? {
              transactions: initialTransactions,
              total: initialTotal || 0,
              limit: PAGE_SIZE,
              offset: 0,
            }
          : undefined,
    }
  )

  const isLoading = isLoadingStats || isLoadingTx || !statsData

  const currentData: PaginatedTransactions = {
    transactions: txData?.transactions || [],
    total: txData?.total || 0,
    page,
    limit: PAGE_SIZE,
    totalPages: Math.ceil((txData?.total || 0) / PAGE_SIZE),
  }

  const { expensesByCategory, incomeByCategory } = useMemo(() => {
    if (!summaryData?.summary) {
      return {
        expensesByCategory: initialExpensesByCategory || [],
        incomeByCategory: initialIncomeByCategory || [],
      }
    }

    const expenseMap = new Map<string, { color: string; amount: number }>()
    const incomeMap = new Map<string, { color: string; amount: number }>()

    summaryData.summary.forEach((item) => {
      const rawAmount = Number(item.total_amount)
      const catName = item.category_name || 'Sin categoría'
      const color = item.category_color || '#6B7280'

      if (rawAmount < 0) {
        const amount = Math.abs(rawAmount)
        const existing = expenseMap.get(catName)
        if (existing) {
          existing.amount += amount
        } else {
          expenseMap.set(catName, { color, amount })
        }
      } else if (rawAmount > 0) {
        const existing = incomeMap.get(catName)
        if (existing) {
          existing.amount += rawAmount
        } else {
          incomeMap.set(catName, { color, amount: rawAmount })
        }
      }
    })

    const sortedExpenses = Array.from(expenseMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)

    const sortedIncome = Array.from(incomeMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)

    return {
      expensesByCategory: sortedExpenses,
      incomeByCategory: sortedIncome,
    }
  }, [summaryData?.summary, initialExpensesByCategory, initialIncomeByCategory])

  useEffect(() => {
    setPage(1)
  }, [period, selectedMonth, selectedYear, customStartDate, customEndDate, activeTab])

  // Manejar cambio de periodo personalizado a través del DatePicker
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setCustomDates(startDate, endDate)
    setPeriod('custom')
    // Exclusión mutua: al activar periodo, anulamos mes y año
    setYear(null)
    setMonth(null)
  }

  const handleYearChange = (year: number | null) => {
    setYear(year)
    if (year !== null) {
      setMonth(null)
      // Exclusión mutua: al activar año, anulamos periodo custom
      setCustomDates('', '')
      setPeriod('yearly')
    }
  }

  const handleMonthChange = (month: number | null) => {
    setMonth(month)
    if (month === null) {
      setPeriod('yearly')
    } else {
      setPeriod('monthly')
    }
    // Exclusión mutua: al activar mes, anulamos periodo custom
    setCustomDates('', '')
  }

  const handleCategoryClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsCategoryModalOpen(true)
  }

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Header con Tabs + Filtros integrados */}
      <div className="relative">
        <Tabs
          tabs={balanceTabs}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as 'balance' | 'income' | 'expenses')}
          variant="underline-responsive"
          rightContent={
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
          }
        />
      </div>

      <div className="px-4 md:px-6 py-6">
        {isLoading ? (
          <BalanceSkeleton />
        ) : period === 'custom' && (!customStartDate || !customEndDate) ? (
          <Card>
            <CardContent className="py-16">
              <p className="text-center text-text-secondary">
                Selecciona una fecha de inicio y fin para ver los datos
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {activeTab === 'balance' && (
              <BalanceTab
                stats={stats}
                expensesByCategory={expensesByCategory}
                incomeByCategory={incomeByCategory}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
                periodLabel={getPeriodLabel()}
              />
            )}

            {activeTab === 'income' && (
              <IncomeTab
                stats={stats}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
                periodLabel={getPeriodLabel()}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTab
                stats={stats}
                expensesByCategory={expensesByCategory}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
                periodLabel={getPeriodLabel()}
              />
            )}
          </div>
        )}
      </div>

      {account && (
        <CategoryChangeModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
          accountId={account.id}
          allTransactions={txData?.transactions || []}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}
