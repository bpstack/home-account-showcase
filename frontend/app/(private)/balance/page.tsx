'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { transactions as transactionsApi } from '@/lib/apiClient'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Tabs,
  useActiveTab,
  Input,
} from '@/components/ui'
import { TransactionTable, CategoryChangeModal } from '@/components/transactions'
import { ArrowLeft, ArrowRight, Calendar, Loader2 } from 'lucide-react'
import type { Transaction } from '@/lib/apiClient'

/**
 * TODO: Documentación de Optimización de Rendimiento
 * =================================================
 *
 * 1. Paginación Server-Side (React Query + Next.js)
 *    - https://tanstack.com/query/latest/docs/framework/react/pagination
 *    - https://nextjs.org/docs/app/building-your-application/routing/loading-ui
 *
 * 2. Infinite Loading vs Paginación Tradicional
 *    - https://tanstack.com/query/latest/docs/framework/react/infinite-queries
 *    - Para tablas grandes, infinite scroll puede ser mejor UX
 *    - Para exportación/búsqueda, paginación numerada es más accesible
 *
 * 3. Prefetching y Caching
 *    - https://tanstack.com/query/latest/docs/framework/react/prefetching
 *    - staleTime configurado para evitar refetches innecesarios
 *    - keepPreviousData para mantener UI estable durante carga
 *
 * 4. Optimización de Imágenes y Recursos
 *    - https://nextjs.org/docs/app/building-your-application/optimizing/images
 *    - https://nextjs.org/docs/app/building-your-application/optimizing/scripts
 *
 * 5. Server Components vs Client Components
 *    - https://nextjs.org/docs/app/building-your-application/rendering/server-components
 *    - Los tabs y filtros son client-side por interactividad
 *    - Las tablas podrían ser server-rendered con pagination params en URL
 *
 * 6. URL como Fuente de Verdad
 *    - https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating
 *    - Los filtros y página deben estar en URL para shareability
 *    - useSearchParams para leer parámetros de URL
 *
 * Límites Implementados:
 * - LIMIT 50 por página en backend
 * - offset calculado como (page - 1) * limit
 * - Total count en respuesta para UI de paginación
 */

const tabs = [
  { id: 'balance', label: 'Balance' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expenses', label: 'Gastos' },
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

// Genera años disponibles (desde 2020 hasta el año actual + 1)
const currentYearNow = new Date().getFullYear()
const availableYears = Array.from({ length: currentYearNow - 2020 + 2 }, (_, i) => 2020 + i)

type Period = 'monthly' | 'yearly' | 'custom'

// Formatea fecha local sin conversión a UTC (evita desfases de zona horaria)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Configuración de paginación
const PAGE_SIZE = 50

interface PaginatedTransactions {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function BalancePage() {
  const { account } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeTab = useActiveTab('tab', 'balance')
  const period = (searchParams.get('period') as Period) || 'monthly'
  const currentMonth = parseInt(searchParams.get('month') || String(new Date().getMonth()), 10)
  const currentYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
  const customStartDate = searchParams.get('start') || ''
  const customEndDate = searchParams.get('end') || ''

  const updateUrl = useCallback(
    (updates: { period?: Period; month?: number; year?: number; start?: string; end?: string }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (updates.period) params.set('period', updates.period)
      if (updates.month !== undefined) params.set('month', String(updates.month))
      if (updates.year !== undefined) params.set('year', String(updates.year))
      if (updates.start !== undefined) params.set('start', updates.start)
      if (updates.end !== undefined) params.set('end', updates.end)

      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  // Pagination state
  const [page, setPage] = useState(1)

  // State para mantener el desplegable abierto al cambiar fechas
  const [showTransactions, setShowTransactions] = useState(false)

  // State para el modal de cambio de categoria
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)

  const handleCategoryClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsCategoryModalOpen(true)
  }

  const handleCategoryModalClose = () => {
    setIsCategoryModalOpen(false)
    setSelectedTransaction(null)
  }

  const handleCategoryChangeSuccess = () => {
    loadData() // Recargar datos despues de cambiar categoria
  }

  // Stats del backend (totales reales del período completo)
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

  const [monthlyStats, setMonthlyStats] = useState<PeriodStats>(emptyStats)
  const [yearlyStats, setYearlyStats] = useState<PeriodStats>(emptyStats)
  const [customStats, setCustomStats] = useState<PeriodStats>(emptyStats)

  // Data states - transacciones para el período actual
  const [currentData, setCurrentData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  })

  const [isLoading, setIsLoading] = useState(true)

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

  // Determinar el tipo de filtro según el tab activo
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

      // Cargar transacciones y stats en paralelo
      const [response, statsResponse] = await Promise.all([
        transactionsApi.getAll({
          account_id: account.id,
          start_date: startDate,
          end_date: endDate,
          type: typeFilter, // Filtrar por tipo en backend si es tab de ingresos/gastos
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        }),
        transactionsApi.getStats(account.id, startDate, endDate),
      ])

      setCurrentData({
        transactions: response.transactions,
        total: response.total || 0,
        page,
        limit: response.limit || PAGE_SIZE,
        totalPages: Math.ceil((response.total || 0) / (response.limit || PAGE_SIZE)),
      })

      // Actualizar stats según el período
      if (statsResponse.success) {
        if (period === 'monthly') {
          setMonthlyStats(statsResponse.stats)
        } else if (period === 'yearly') {
          setYearlyStats(statsResponse.stats)
        } else {
          setCustomStats(statsResponse.stats)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setCurrentData((prev) => ({ ...prev, transactions: [], total: 0 }))
    } finally {
      setIsLoading(false)
    }
  }, [account, period, currentMonth, currentYear, customStartDate, customEndDate, page, activeTab, getDateRange, getTypeFilter])

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1)
  }, [period, currentMonth, currentYear, customStartDate, customEndDate, activeTab])

  // Cargar datos cuando cambian los parámetros
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

  const prevYear = () => updateUrl({ year: currentYear - 1 })
  const nextYear = () => updateUrl({ year: currentYear + 1 })

  // Obtener stats según el período actual
  const currentStats =
    period === 'monthly' ? monthlyStats : period === 'yearly' ? yearlyStats : customStats

  // Usar stats del backend para totales reales del período completo
  const currentTotals = { income: currentStats.income, expenses: currentStats.expenses }
  const currentSavings = currentStats.balance

  // Desglose de ingresos por tipo del backend (correcto para todo el período)
  const currentIncomeByType = currentStats.incomeByType

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Tabs tabs={tabs} defaultTab="balance" />

        <div className="flex items-center gap-2">
          <Button
            variant={period === 'monthly' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => updateUrl({ period: 'monthly' })}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Mensual
          </Button>
          <Button
            variant={period === 'yearly' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => updateUrl({ period: 'yearly' })}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Anual
          </Button>
          <Button
            variant={period === 'custom' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => updateUrl({ period: 'custom' })}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Personalizado
          </Button>
        </div>
      </div>

      {period === 'monthly' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <select
            value={currentYear}
            onChange={(e) => updateUrl({ year: parseInt(e.target.value, 10) })}
            className="bg-layer-2 border border-layer-3 rounded-md px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={currentMonth}
            onChange={(e) => updateUrl({ month: parseInt(e.target.value, 10) })}
            className="bg-layer-2 border border-layer-3 rounded-md px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-w-[120px]"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {period === 'yearly' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={prevYear}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <select
            value={currentYear}
            onChange={(e) => updateUrl({ year: parseInt(e.target.value, 10) })}
            className="bg-layer-2 border border-layer-3 rounded-md px-3 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="icon" onClick={nextYear}>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {period === 'custom' && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Desde:</span>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => updateUrl({ start: e.target.value })}
              className="w-[150px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Hasta:</span>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => updateUrl({ end: e.target.value })}
              className="w-[150px]"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando datos...
        </div>
      ) : (
        <>
          {/* Generar labels según el período */}
          {(() => {
            const periodLabel =
              period === 'monthly'
                ? `${months[currentMonth]} ${currentYear}`
                : period === 'yearly'
                  ? `Año ${currentYear}`
                  : `${customStartDate} - ${customEndDate}`

            const titleSuffix =
              period === 'monthly'
                ? 'del mes'
                : period === 'yearly'
                  ? `del año ${currentYear}`
                  : 'del período'

            return (
              <>
                {activeTab === 'balance' && (
                  <BalanceTab
                    title={`Transacciones ${titleSuffix}`}
                    totals={currentTotals}
                    savings={currentSavings}
                    data={currentData}
                    setPage={setPage}
                    periodLabel={periodLabel}
                    showTransactions={showTransactions}
                    setShowTransactions={setShowTransactions}
                    onCategoryClick={handleCategoryClick}
                  />
                )}
                {activeTab === 'income' && (
                  <IncomeTab
                    title={`Ingresos ${titleSuffix}`}
                    incomeByType={currentIncomeByType}
                    totalIncome={currentTotals.income}
                    data={currentData}
                    setPage={setPage}
                    periodLabel={periodLabel}
                    showTransactions={showTransactions}
                    setShowTransactions={setShowTransactions}
                    onCategoryClick={handleCategoryClick}
                  />
                )}
                {activeTab === 'expenses' && (
                  <ExpensesTab
                    title={`Gastos ${titleSuffix}`}
                    totals={currentTotals}
                    savings={currentSavings}
                    data={currentData}
                    setPage={setPage}
                    periodLabel={periodLabel}
                    showTransactions={showTransactions}
                    setShowTransactions={setShowTransactions}
                    onCategoryClick={handleCategoryClick}
                  />
                )}
              </>
            )
          })()}
          {period === 'custom' && (!customStartDate || !customEndDate) && (
            <Card>
              <CardContent className="py-12">
                <p className="text-sm text-text-secondary text-center">
                  Selecciona una fecha de inicio y fin para ver las transacciones
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modal para cambio de categoria */}
      {account && (
        <CategoryChangeModal
          isOpen={isCategoryModalOpen}
          onClose={handleCategoryModalClose}
          transaction={selectedTransaction}
          accountId={account.id}
          onSuccess={handleCategoryChangeSuccess}
        />
      )}
    </div>
  )
}

function BalanceTab({
  title,
  totals,
  savings,
  data,
  setPage,
  periodLabel,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  title: string
  totals: { income: number; expenses: number }
  savings: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
  showTransactions: boolean
  setShowTransactions: (show: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                <span className="text-success font-bold">+</span>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Ingresos</p>
                <p className="text-xl font-bold text-success">+{formatCurrency(totals.income)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-danger/5 border-danger/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-danger/20 flex items-center justify-center">
                <span className="text-danger font-bold">-</span>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Gastos</p>
                <p className="text-xl font-bold text-danger">-{formatCurrency(totals.expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold">=</span>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Ahorro</p>
                <p className={`text-xl font-bold ${savings >= 0 ? 'text-accent' : 'text-danger'}`}>
                  {savings >= 0 ? '+' : ''}
                  {formatCurrency(savings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-layer-2 flex items-center justify-center">
                <span className="text-text-secondary font-bold">$</span>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Saldo CC</p>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(savings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-1 rounded-full">
              {data.total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{periodLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransactions(!showTransactions)}
            >
              {showTransactions ? 'Ocultar' : 'Ver detalle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTransactions && (
            <TransactionTable
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onCategoryClick={onCategoryClick}
            />
          )}
          {!showTransactions && (
            <p className="text-sm text-text-secondary text-center py-4">
              Haz clic en "Ver detalle" para consultar las transacciones
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IncomeTab({
  title,
  incomeByType,
  totalIncome,
  data,
  setPage,
  periodLabel,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  title: string
  incomeByType: Record<string, number>
  totalIncome: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
  showTransactions: boolean
  setShowTransactions: (show: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const incomeTypes = [
    { key: 'Nómina', label: 'Nómina' },
    { key: 'Transferencias', label: 'Transferencias' },
    { key: 'Bizum', label: 'Bizum' },
    { key: 'Bonificaciones', label: 'Bonificaciones' },
    { key: 'Otros Ingresos', label: 'Otros Ingresos' },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Desglose de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          {totalIncome === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              No hay ingresos registrados
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {incomeTypes.map(({ key, label }) => {
                const value = incomeByType[key] || 0
                if (value === 0) return null
                return (
                  <div key={key} className="text-center p-4 bg-layer-2 rounded-lg">
                    <p className="text-sm text-text-secondary mb-1">{label}</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(value)}</p>
                  </div>
                )
              })}
              <div className="text-center p-4 bg-accent/10 rounded-lg border border-accent/30">
                <p className="text-sm text-text-secondary mb-1">Total</p>
                <p className="text-xl font-bold text-accent">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-1 rounded-full">
              {data.transactions.filter((tx) => Number(tx.amount) >= 0).length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{periodLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransactions(!showTransactions)}
            >
              {showTransactions ? 'Ocultar' : 'Ver detalle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTransactions && (
            <TransactionTable
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onCategoryClick={onCategoryClick}
            />
          )}
          {!showTransactions && (
            <p className="text-sm text-text-secondary text-center py-4">
              Haz clic en "Ver detalle" para consultar los ingresos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ExpensesTab({
  title,
  totals,
  savings,
  data,
  setPage,
  periodLabel,
  showTransactions,
  setShowTransactions,
  onCategoryClick,
}: {
  title: string
  totals: { income: number; expenses: number }
  savings: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
  showTransactions: boolean
  setShowTransactions: (show: boolean) => void
  onCategoryClick: (tx: Transaction) => void
}) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const variableExpenses = Math.max(0, totals.expenses - 576.25)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-danger/5 border border-danger/20 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Fijos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(576.25)}</p>
            </div>
            <div className="p-4 bg-layer-2 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Gastos Variables</p>
              <p className="text-2xl font-bold text-text-primary">
                -{formatCurrency(variableExpenses)}
              </p>
            </div>
            <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Total Gastos</p>
              <p className="text-2xl font-bold text-danger">-{formatCurrency(totals.expenses)}</p>
            </div>
            <div
              className={`p-4 rounded-lg border ${
                savings >= 0 ? 'bg-accent/10 border-accent/30' : 'bg-danger/10 border-danger/30'
              }`}
            >
              <p className="text-sm text-text-secondary mb-1">Ahorro</p>
              <p className={`text-2xl font-bold ${savings >= 0 ? 'text-accent' : 'text-danger'}`}>
                {savings >= 0 ? '+' : ''}
                {formatCurrency(savings)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            <span className="text-xs text-text-secondary bg-layer-2 px-2 py-1 rounded-full">
              {data.transactions.filter((tx) => Number(tx.amount) < 0).length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">{periodLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTransactions(!showTransactions)}
            >
              {showTransactions ? 'Ocultar' : 'Ver detalle'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showTransactions && (
            <TransactionTable
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onCategoryClick={onCategoryClick}
            />
          )}
          {!showTransactions && (
            <p className="text-sm text-text-secondary text-center py-4">
              Haz clic en "Ver detalle" para consultar los gastos
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
