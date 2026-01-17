'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { transactions as transactionsApi } from '@/lib/apiClient'
import { useCategories } from '@/lib/queries/categories'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  FilterSelect,
} from '@/components/ui'
import { ResponsiveTransactionTable, CategoryChangeModal } from '@/components/transactions'
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
} from 'lucide-react'
import type { Transaction } from '@/lib/apiClient'

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

const currentYearNow = new Date().getFullYear()
const availableYears = Array.from({ length: currentYearNow - 2020 + 2 }, (_, i) => 2020 + i)

type Period = 'monthly' | 'yearly' | 'custom'
type TabType = 'balance' | 'income' | 'expenses'

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const PAGE_SIZE = 50

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

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

function BalancePageFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
    </div>
  )
}

export default function BalancePage() {
  return (
    <Suspense fallback={<BalancePageFallback />}>
      <BalancePageContent />
    </Suspense>
  )
}

function BalancePageContent() {
  const { account } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // URL state
  const activeTab = (searchParams.get('tab') as TabType) || 'balance'
  const period = (searchParams.get('period') as Period) || 'monthly'
  const currentMonth = parseInt(searchParams.get('month') || String(new Date().getMonth()), 10)
  const currentYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const customStartDate = searchParams.get('start') || ''
  const customEndDate = searchParams.get('end') || ''

  // Local state
  const [page, setPage] = useState(1)
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [stats, setStats] = useState<PeriodStats>(emptyStats)
  const [currentData, setCurrentData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [expensesByCategory, setExpensesByCategory] = useState<
    { name: string; color: string; amount: number }[]
  >([])
  const [incomeByCategory, setIncomeByCategory] = useState<
    { name: string; color: string; amount: number }[]
  >([])

  const { data: catData } = useCategories(account?.id || '')

  const updateUrl = useCallback(
    (updates: {
      tab?: TabType
      period?: Period
      month?: number
      year?: number
      start?: string
      end?: string
    }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (updates.tab) params.set('tab', updates.tab)
      if (updates.period) params.set('period', updates.period)
      if (updates.month !== undefined) params.set('month', String(updates.month))
      if (updates.year !== undefined) params.set('year', String(updates.year))
      if (updates.start !== undefined) params.set('start', updates.start)
      if (updates.end !== undefined) params.set('end', updates.end)
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const getDateRange = useCallback(() => {
    switch (period) {
      case 'monthly':
        return {
          startDate: formatLocalDate(new Date(currentYear, currentMonth, 1)),
          endDate: formatLocalDate(new Date(currentYear, currentMonth + 1, 0)),
        }
      case 'yearly':
        return {
          startDate: `${currentYear}-01-01`,
          endDate: `${currentYear}-12-31`,
        }
      case 'custom':
        return {
          startDate: customStartDate || '',
          endDate: customEndDate || '',
        }
    }
  }, [period, currentMonth, currentYear, customStartDate, customEndDate])

  const getTypeFilter = useCallback((): 'income' | 'expense' | undefined => {
    if (activeTab === 'income') return 'income'
    if (activeTab === 'expenses') return 'expense'
    return undefined
  }, [activeTab])

  const loadData = useCallback(async () => {
    if (!account) return
    if (period === 'custom' && (!customStartDate || !customEndDate)) return

    setIsLoading(true)

    try {
      const { startDate, endDate } = getDateRange()
      const typeFilter = getTypeFilter()

      const [response, statsResponse, summaryResponse] = await Promise.all([
        transactionsApi.getAll({
          account_id: account.id,
          start_date: startDate,
          end_date: endDate,
          type: typeFilter,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        transactionsApi.getStats(account.id, startDate, endDate),
        transactionsApi.getSummary(account.id, startDate, endDate),
      ])

      setCurrentData({
        transactions: response.transactions,
        total: response.total || 0,
        page,
        limit: response.limit || PAGE_SIZE,
        totalPages: Math.ceil((response.total || 0) / (response.limit || PAGE_SIZE)),
      })

      if (statsResponse.success) {
        setStats(statsResponse.stats)
      }

      // Process income and expenses by category separately
      if (summaryResponse.summary) {
        const expenseMap = new Map<string, { color: string; amount: number }>()
        const incomeMap = new Map<string, { color: string; amount: number }>()

        summaryResponse.summary.forEach(
          (item: {
            category_name: string
            category_color: string
            total_amount: string | number
          }) => {
            const rawAmount = Number(item.total_amount)
            const catName = item.category_name || 'Sin categoría'
            const color = item.category_color || '#6B7280'

            if (rawAmount < 0) {
              // Es un gasto (negativo)
              const amount = Math.abs(rawAmount)
              const existing = expenseMap.get(catName)
              if (existing) {
                existing.amount += amount
              } else {
                expenseMap.set(catName, { color, amount })
              }
            } else if (rawAmount > 0) {
              // Es un ingreso (positivo)
              const existing = incomeMap.get(catName)
              if (existing) {
                existing.amount += rawAmount
              } else {
                incomeMap.set(catName, { color, amount: rawAmount })
              }
            }
          }
        )

        const sortedExpenses = Array.from(expenseMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.amount - a.amount)
        setExpensesByCategory(sortedExpenses)

        const sortedIncome = Array.from(incomeMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.amount - a.amount)
        setIncomeByCategory(sortedIncome)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [
    account,
    period,
    currentMonth,
    currentYear,
    customStartDate,
    customEndDate,
    page,
    activeTab,
    getDateRange,
    getTypeFilter,
  ])

  useEffect(() => {
    setPage(1)
  }, [period, currentMonth, currentYear, customStartDate, customEndDate, activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const prevMonth = () => {
    if (currentMonth === 0) {
      updateUrl({ month: 11, year: currentYear - 1 })
    } else {
      updateUrl({ month: currentMonth - 1 })
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      updateUrl({ month: 0, year: currentYear + 1 })
    } else {
      updateUrl({ month: currentMonth + 1 })
    }
  }

  const handleCategoryClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsCategoryModalOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const getPeriodLabel = () => {
    if (period === 'monthly') return `${monthsFull[currentMonth]} ${currentYear}`
    if (period === 'yearly') return `Año ${currentYear}`
    if (customStartDate && customEndDate) {
      return `${customStartDate} → ${customEndDate}`
    }
    return 'Selecciona fechas'
  }

  const monthOptions = monthsFull.map((month, index) => ({ value: String(index), label: month }))
  const yearOptions = availableYears.map((year) => ({ value: String(year), label: String(year) }))

  return (
    <div className="space-y-6">
      {/* Header con tabs y filtros */}
      <div className="flex flex-col gap-4">
        {/* Tabs de contenido y filtro de período */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs de contenido */}
          <div className="inline-flex p-1 bg-layer-2 rounded-lg self-center sm:self-auto">
            {[
              { id: 'balance', label: 'Balance', icon: Wallet },
              { id: 'income', label: 'Ingresos', icon: TrendingUp },
              { id: 'expenses', label: 'Gastos', icon: TrendingDown },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => updateUrl({ tab: id as TabType })}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${
                  activeTab === id
                    ? 'bg-layer-1 text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Filtro de período */}
          <div className="inline-flex p-1 bg-layer-2 rounded-lg self-center sm:self-auto">
            {[
              { id: 'monthly', label: 'Mes' },
              { id: 'yearly', label: 'Año' },
              { id: 'custom', label: 'Rango' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => updateUrl({ period: id as Period })}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  period === id
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selector de fecha según período */}
        <div className="flex items-center justify-center">
          {period === 'monthly' && (
            <div className="flex items-center gap-2 bg-layer-2 rounded-lg p-1.5">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <FilterSelect
                value={String(currentMonth)}
                onChange={(e) => updateUrl({ month: parseInt(e.target.value, 10) })}
                options={monthOptions}
                className="w-32"
              />

              <FilterSelect
                value={String(currentYear)}
                onChange={(e) => updateUrl({ year: parseInt(e.target.value, 10) })}
                options={yearOptions}
                className="w-24"
              />

              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-9 w-9">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {period === 'yearly' && (
            <div className="flex items-center gap-2 bg-layer-2 rounded-lg p-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateUrl({ year: currentYear - 1 })}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <FilterSelect
                value={String(currentYear)}
                onChange={(e) => updateUrl({ year: parseInt(e.target.value, 10) })}
                options={yearOptions}
                className="w-24"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateUrl({ year: currentYear + 1 })}
                className="h-9 w-9"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {period === 'custom' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-layer-2 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-text-secondary hidden sm:block" />
                <span className="text-xs text-text-secondary sm:hidden">Desde</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => updateUrl({ start: e.target.value })}
                  className="h-9 w-36 text-sm"
                />
              </div>
              <span className="text-text-secondary hidden sm:block">→</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary sm:hidden">Hasta</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => updateUrl({ end: e.target.value })}
                  className="h-9 w-36 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Período actual */}
      <p className="text-center text-sm text-text-secondary">{getPeriodLabel()}</p>

      {/* Loading state */}
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
        <>
          {/* Tab Balance */}
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

          {/* Tab Ingresos */}
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

          {/* Tab Gastos */}
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
        </>
      )}

      {/* Modal de cambio de categoría */}
      {account && (
        <CategoryChangeModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false)
            setSelectedTransaction(null)
          }}
          transaction={selectedTransaction}
          accountId={account.id}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}

// ============================================
// TAB: BALANCE
// ============================================
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
      {/* Cards principales */}
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
                <p
                  className={`text-lg font-bold truncate ${stats.balance >= 0 ? 'text-accent' : 'text-danger'}`}
                >
                  {stats.balance >= 0 ? '+' : ''}
                  {formatCurrency(stats.balance)}
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

      {/* Distribución de ingresos y gastos - 2 columnas */}
      {(incomeByCategory.length > 0 || expensesByCategory.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Columna de Ingresos */}
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
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm text-text-primary truncate">{cat.name}</span>
                          </div>
                          <span className="text-sm font-medium text-text-primary ml-3 shrink-0">
                            {formatCurrency(cat.amount)}
                          </span>
                        </div>
                        <div className="h-2 bg-layer-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                          />
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

          {/* Columna de Gastos */}
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
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
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
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                          />
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

      {/* Transacciones */}
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

// ============================================
// TAB: INGRESOS
// ============================================
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
      {/* Total de ingresos */}
      <Card className="bg-gradient-to-r from-success/5 to-transparent border-success/20">
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-sm text-text-secondary mb-1">Total Ingresos</p>
            <p className="text-4xl font-bold text-success">+{formatCurrency(stats.income)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Desglose por tipo */}
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
            <p className="text-center text-text-secondary">
              No hay ingresos registrados en este período
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transacciones */}
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

// ============================================
// TAB: GASTOS
// ============================================
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
      {/* Total de gastos */}
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

      {/* Desglose por categoría */}
      {hasExpenses && expensesByCategory.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {expensesByCategory.map((cat) => {
            const percentage = (cat.amount / stats.expenses) * 100
            return (
              <Card key={cat.name} className="hover:border-layer-3 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <p className="text-xs text-text-secondary truncate">{cat.name}</p>
                  </div>
                  <p className="text-base font-bold text-text-primary">
                    {formatCurrency(cat.amount)}
                  </p>
                  <div className="mt-2 h-1 bg-layer-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                    />
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
            <p className="text-center text-text-secondary">
              No hay gastos registrados en este período
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transacciones */}
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

// ============================================
// SECCIÓN: TRANSACCIONES (compartida)
// ============================================
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
      <div
        className="px-6 py-4 cursor-pointer hover:bg-layer-2/50 transition-colors"
        onClick={() => setShowTransactions(!showTransactions)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-text-primary">{title}</h3>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-0.5 rounded-full">
              {data.total}
            </span>
          </div>
          <Button variant="ghost" size="sm">
            {showTransactions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
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
