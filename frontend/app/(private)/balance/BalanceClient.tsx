'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { transactions as transactionsApi } from '@/lib/apiClient'
import { useCategories } from '@/lib/queries/categories'
import { useTransactionStats, useTransactions } from '@/lib/queries/transactions'
import { useTransactionSummary } from '@/lib/queries/transactions'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  PageFilters,
} from '@/components/ui'
import { ResponsiveTransactionTable, CategoryChangeModal } from '@/components/transactions'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import type { Transaction } from '@/lib/apiClient'
import { useBalanceStore } from '@/stores/balanceStore'
import { useFiltersStore } from '@/stores/filtersStore'

const monthsFull = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const currentYearNow = new Date().getFullYear()
const availableYears = Array.from({ length: currentYearNow - 2020 + 2 }, (_, i) => 2020 + i)

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

function BalancePageFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
    </div>
  )
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
  const searchParams = useSearchParams()

  // Usar stores de Zustand como fuente de verdad
  const { selectedYear, selectedMonth, setYear, setMonth, reset: resetFilters } = useFiltersStore()
  const { activeTab, period, customStartDate, customEndDate, setActiveTab, setPeriod, setCustomDates, reset: resetBalance } = useBalanceStore()


  const hasActiveFilters = 
    selectedMonth !== null || 
    selectedYear !== new Date().getFullYear() || 
    period !== 'monthly'

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
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        return `${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}`
      default:
        return ''
    }
  }

  const [page, setPage] = useState(1)
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [stats, setStats] = useState<PeriodStats>(initialStats || emptyStats)
  const [expensesByCategory, setExpensesByCategory] = useState(
    initialExpensesByCategory || []
  )
  const [incomeByCategory, setIncomeByCategory] = useState(
    initialIncomeByCategory || []
  )

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'monthly':
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

      case 'yearly':
        const yToUse = selectedYear ?? new Date().getFullYear()
        return {
          startDate: `${yToUse}-01-01`,
          endDate: `${yToUse}-12-31`,
        }

      case 'custom':
        return {
          startDate: customStartDate || '',
          endDate: customEndDate || '',
        }
    }
  }, [period, selectedYear, selectedMonth, customStartDate, customEndDate])

  const getTypeFilter = useCallback((): 'income' | 'expense' | undefined => {
    if (activeTab === 'income') return 'income'
    if (activeTab === 'expenses') return 'expense'
    return undefined
  }, [activeTab])

  const { startDate, endDate } = getDateRange()
  const typeFilter = getTypeFilter()

  const { data: statsData, isLoading: isLoadingStats } = useTransactionStats(account?.id || '', startDate, endDate, {
    initialData: initialStats ? { success: true, stats: initialStats } : undefined,
  })

  const { data: summaryData } = useTransactionSummary(account?.id || '', startDate, endDate)

  const { data: txData, isLoading: isLoadingTx } = useTransactions({
    account_id: account?.id || '',
    start_date: startDate,
    end_date: endDate,
    type: typeFilter,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }, {
    staleTime: 30_000,
    initialData: initialTransactions && page === 1 && !hasActiveFilters
      ? { transactions: initialTransactions, total: initialTotal || 0, limit: PAGE_SIZE, offset: 0 }
      : undefined,
  })

  const isLoading = isLoadingStats || isLoadingTx || !statsData

  const currentData: PaginatedTransactions = {
    transactions: txData?.transactions || [],
    total: txData?.total || 0,
    page,
    limit: PAGE_SIZE,
    totalPages: Math.ceil((txData?.total || 0) / PAGE_SIZE),
  }

  useEffect(() => {
    if (statsData?.stats) {
      setStats(statsData.stats)
    }
  }, [statsData])

  useEffect(() => {
    if (summaryData?.summary) {
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
      setExpensesByCategory(sortedExpenses)

      const sortedIncome = Array.from(incomeMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount)
      setIncomeByCategory(sortedIncome)
    }
  }, [summaryData])

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
              onMonthChange={setMonth}
              showYearSelect
              year={selectedYear}
              onYearChange={(y) => {
                setYear(y)
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




          }
        />
      </div>

      <div className="px-4 md:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
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
              <BalanceTabContent
                stats={stats}
                expensesByCategory={expensesByCategory}
                incomeByCategory={incomeByCategory}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
              />
            )}

            {activeTab === 'income' && (
              <IncomeTabContent
                stats={stats}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesTabContent
                stats={stats}
                expensesByCategory={expensesByCategory}
                formatCurrency={formatCurrency}
                data={currentData}
                setPage={setPage}
                showTransactions={showTransactions}
                setShowTransactions={setShowTransactions}
                onCategoryClick={handleCategoryClick}
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

function BalanceTabContent({
  stats,
  expensesByCategory,
  incomeByCategory,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  stats: PeriodStats
  expensesByCategory: { name: string; color: string; amount: number }[]
  incomeByCategory: { name: string; color: string; amount: number }[]
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Ingresos</p>
                <p className="text-lg font-bold text-success truncate">
                  +{formatCurrency(stats.income)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-danger">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-danger/10 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-danger" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Gastos</p>
                <p className="text-lg font-bold text-danger truncate">
                  -{formatCurrency(stats.expenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <PiggyBank className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Ahorro</p>
                <p className={`text-lg font-bold truncate ${stats.balance >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-layer-2 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary uppercase tracking-wide">Tasa ahorro</p>
                <p className="text-lg font-bold text-text-primary truncate">
                  {stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(incomeByCategory.length > 0 || expensesByCategory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 border-b border-layer-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  Ingresos
                </CardTitle>
                <span className="text-lg font-bold text-success">
                  +{formatCurrency(stats.income)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {incomeByCategory.length > 0 ? (
                <div className="space-y-3">
                  {incomeByCategory.slice(0, 5).map((cat) => {
                    const percentage = stats.income > 0 ? (cat.amount / stats.income) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary ml-3 shrink-0">
                            {formatCurrency(cat.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-6">Sin ingresos</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader className="pb-2 border-b border-layer-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-danger" />
                  Gastos
                </CardTitle>
                <span className="text-lg font-bold text-danger">
                  -{formatCurrency(stats.expenses)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {expensesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {expensesByCategory.slice(0, 8).map((cat) => {
                    const percentage = stats.expenses > 0 ? (cat.amount / stats.expenses) * 100 : 0
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <span className="text-xs text-text-secondary w-10 text-right">
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="text-sm font-medium text-text-primary w-24 text-right">
                              {formatCurrency(cat.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-6">Sin gastos</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <TransactionsSection
        data={data}
        setPage={setPage}
        showTransactions={showTransactions}
        setShowTransactions={setShowTransactions}
        onCategoryClick={onCategoryClick}
        title="Todas las transacciones"
      />
    </div>
  )
}

function IncomeTabContent({
  stats,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  stats: PeriodStats
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {
  const incomeTypes = [
    { key: 'Nómina', label: 'Nómina', icon: '💼' },
    { key: 'Transferencias', label: 'Transferencias', icon: '💸' },
    { key: 'Bizum', label: 'Bizum', icon: '📱' },
    { key: 'Bonificaciones', label: 'Bonificaciones', icon: '🎁' },
    { key: 'Otros Ingresos', label: 'Otros', icon: '📈' },
  ]

  const hasIncome = stats.income > 0

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-success/5 to-transparent border-success/20">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-1">Total Ingresos</p>
            <p className="text-4xl font-bold text-success">+{formatCurrency(stats.income)}</p>
          </div>
        </CardContent>
      </Card>

      {hasIncome ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {incomeTypes.map(({ key, label, icon }) => {
            const value = stats.incomeByType[key] || 0
            if (value === 0) return null
            const percentage = (value / stats.income) * 100
            return (
              <Card key={key} className="hover:border-success/30 transition-colors">
                <CardContent className="py-4 text-center">
                  <span className="text-2xl mb-2 block">{icon}</span>
                  <p className="text-xs text-text-secondary mb-1">{label}</p>
                  <p className="text-base font-bold text-success">{formatCurrency(value)}</p>
                  <p className="text-xs text-text-secondary">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-text-secondary">No hay ingresos registrados en este período</p>
          </CardContent>
        </Card>
      )}

      <TransactionsSection
        data={data}
        setPage={setPage}
        showTransactions={showTransactions}
        setShowTransactions={setShowTransactions}
        onCategoryClick={onCategoryClick}
        title="Detalle de ingresos"
      />
    </div>
  )
}

function ExpensesTabContent({
  stats,
  expensesByCategory,
  formatCurrency,
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  stats: PeriodStats
  expensesByCategory: { name: string; color: string; amount: number }[]
  formatCurrency: (v: number) => string
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {
  const hasExpenses = stats.expenses > 0

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-danger/5 to-transparent border-danger/20">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-1">Total Gastos</p>
            <p className="text-4xl font-bold text-danger">-{formatCurrency(stats.expenses)}</p>
            {stats.income > 0 && (
              <p className="text-sm text-text-secondary mt-2">
                {((stats.expenses / stats.income) * 100).toFixed(1)}% de los ingresos
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {hasExpenses && expensesByCategory.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {expensesByCategory.map((cat) => {
            const percentage = (cat.amount / stats.expenses) * 100
            return (
              <Card key={cat.name} className="hover:border-layer-3 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <p className="text-xs text-text-secondary truncate">{cat.name}</p>
                  </div>
                  <p className="text-base font-bold text-text-primary">{formatCurrency(cat.amount)}</p>
                  <div className="mt-2 h-1 bg-layer-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }} />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{percentage.toFixed(1)}%</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-text-secondary">No hay gastos registrados en este período</p>
          </CardContent>
        </Card>
      )}

      <TransactionsSection
        data={data}
        setPage={setPage}
        showTransactions={showTransactions}
        setShowTransactions={setShowTransactions}
        onCategoryClick={onCategoryClick}
        title="Detalle de gastos"
      />
    </div>
  )
}

function TransactionsSection({
  data,
  setPage,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
  title,
}: {
  data: PaginatedTransactions
  setPage: (p: number) => void
  showTransactions: boolean
  setShowTransactions: (s: boolean) => void
  onCategoryClick: (tx: Transaction) => void
  title: string
}) {
  return (
    <Card>
      <div className="px-6 py-4 cursor-pointer hover:bg-layer-2/50 transition-colors" onClick={() => setShowTransactions(!showTransactions)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-0.5 rounded-full">{data.total}</span>
          </div>
          <Button variant="ghost" size="sm">
            {showTransactions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {showTransactions && (
        <CardContent className="pt-0">
          <ResponsiveTransactionTable
            transactions={data.transactions}
            total={data.total}
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={setPage}
            onCategoryClick={onCategoryClick}
          />
        </CardContent>
      )}
    </Card>
  )
}
