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
import { ArrowLeft, ArrowRight, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
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

type Period = 'monthly' | 'yearly' | 'custom'

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

  // Data states
  const [monthlyData, setMonthlyData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  })
  const [yearlyData, setYearlyData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  })
  const [customData, setCustomData] = useState<PaginatedTransactions>({
    transactions: [],
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  })

  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true)
  const [isLoadingYearly, setIsLoadingYearly] = useState(true)
  const [isLoadingCustom, setIsLoadingCustom] = useState(false)

  const getDateRange = useCallback(
    (p: Period, month: number, year: number, start?: string, end?: string) => {
      switch (p) {
        case 'monthly':
          return {
            startDate: new Date(year, month, 1).toISOString().split('T')[0],
            endDate: new Date(year, month + 1, 0).toISOString().split('T')[0],
          }
        case 'yearly':
          return {
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
          }
        case 'custom':
          return {
            startDate: start || '',
            endDate: end || '',
          }
      }
    },
    []
  )

  const loadMonthlyData = useCallback(async () => {
    if (!account) return
    setIsLoadingMonthly(true)

    try {
      const { startDate, endDate } = getDateRange('monthly', currentMonth, currentYear)
      const response = await transactionsApi.getAll({
        account_id: account.id,
        start_date: startDate,
        end_date: endDate,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })

      setMonthlyData({
        transactions: response.transactions,
        total: response.total || 0,
        page,
        limit: response.limit || PAGE_SIZE,
        totalPages: Math.ceil((response.total || 0) / (response.limit || PAGE_SIZE)),
      })
    } catch (error) {
      console.error('Error loading monthly data:', error)
      setMonthlyData((prev) => ({ ...prev, transactions: [], total: 0 }))
    } finally {
      setIsLoadingMonthly(false)
    }
  }, [account, currentMonth, currentYear, page, getDateRange])

  const loadYearlyData = useCallback(async () => {
    if (!account) return
    setIsLoadingYearly(true)

    try {
      const { startDate, endDate } = getDateRange('yearly', 0, currentYear)
      const response = await transactionsApi.getAll({
        account_id: account.id,
        start_date: startDate,
        end_date: endDate,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })

      setYearlyData({
        transactions: response.transactions,
        total: response.total || 0,
        page,
        limit: response.limit || PAGE_SIZE,
        totalPages: Math.ceil((response.total || 0) / (response.limit || PAGE_SIZE)),
      })
    } catch (error) {
      console.error('Error loading yearly data:', error)
      setYearlyData((prev) => ({ ...prev, transactions: [], total: 0 }))
    } finally {
      setIsLoadingYearly(false)
    }
  }, [account, currentYear, page, getDateRange])

  const loadCustomData = useCallback(async () => {
    if (!account || !customStartDate || !customEndDate) return
    setIsLoadingCustom(true)

    try {
      const { startDate, endDate } = getDateRange('custom', 0, 0, customStartDate, customEndDate)
      const response = await transactionsApi.getAll({
        account_id: account.id,
        start_date: startDate,
        end_date: endDate,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })

      setCustomData({
        transactions: response.transactions,
        total: response.total || 0,
        page,
        limit: response.limit || PAGE_SIZE,
        totalPages: Math.ceil((response.total || 0) / (response.limit || PAGE_SIZE)),
      })
    } catch (error) {
      console.error('Error loading custom data:', error)
      setCustomData((prev) => ({ ...prev, transactions: [], total: 0 }))
    } finally {
      setIsLoadingCustom(false)
    }
  }, [account, customStartDate, customEndDate, page, getDateRange])

  useEffect(() => {
    setPage(1)
  }, [period, currentMonth, currentYear, customStartDate, customEndDate])

  useEffect(() => {
    if (account) {
      loadMonthlyData()
      loadYearlyData()
      if (customStartDate && customEndDate) {
        loadCustomData()
      }
    }
  }, [account, currentMonth, currentYear, page, loadMonthlyData, loadYearlyData, loadCustomData])

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

  const getTotals = (txs: Transaction[]) =>
    txs.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount)
        if (amount >= 0) {
          acc.income += amount
        } else {
          acc.expenses += Math.abs(amount)
        }
        return acc
      },
      { income: 0, expenses: 0 }
    )

  const getSavings = (totals: { income: number; expenses: number }) =>
    totals.income - totals.expenses

  const getIncomeByType = (txs: Transaction[]) =>
    txs
      .filter((tx) => Number(tx.amount) >= 0)
      .reduce(
        (acc, tx) => {
          const desc = tx.description.toLowerCase()
          let type = 'Otros Ingresos'
          if (desc.includes('nómina') || desc.includes('nomina')) type = 'Nómina'
          else if (desc.includes('transferencia') || desc.includes('transfer'))
            type = 'Transferencias'
          else if (desc.includes('bizum')) type = 'Bizum'
          else if (desc.includes('bonus') || desc.includes('bonific')) type = 'Bonificaciones'
          acc[type] = (acc[type] || 0) + Number(tx.amount)
          return acc
        },
        {} as Record<string, number>
      )

  const monthlyTotals = getTotals(monthlyData.transactions)
  const yearlyTotals = getTotals(yearlyData.transactions)
  const customTotals = getTotals(customData.transactions)
  const monthlySavings = getSavings(monthlyTotals)
  const yearlySavings = getSavings(yearlyTotals)
  const customSavings = getSavings(customTotals)
  const monthlyIncomeByType = getIncomeByType(monthlyData.transactions)
  const yearlyIncomeByType = getIncomeByType(yearlyData.transactions)
  const customIncomeByType = getIncomeByType(customData.transactions)

  const isLoading = isLoadingMonthly || isLoadingYearly || isLoadingCustom

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
          <span className="text-sm font-medium text-text-primary min-w-[140px] text-center">
            {months[currentMonth]} {currentYear}
          </span>
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
          <span className="text-sm font-medium text-text-primary min-w-[80px] text-center">
            {currentYear}
          </span>
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
          {period === 'monthly' && (
            <>
              {activeTab === 'balance' && (
                <BalanceTab
                  title="Transacciones del mes"
                  totals={monthlyTotals}
                  savings={monthlySavings}
                  data={monthlyData}
                  setPage={setPage}
                  periodLabel={`${months[currentMonth]} ${currentYear}`}
                />
              )}
              {activeTab === 'income' && (
                <IncomeTab
                  title="Ingresos del mes"
                  incomeByType={monthlyIncomeByType}
                  totalIncome={monthlyTotals.income}
                  data={monthlyData}
                  setPage={setPage}
                  periodLabel={`${months[currentMonth]} ${currentYear}`}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensesTab
                  title="Gastos del mes"
                  totals={monthlyTotals}
                  savings={monthlySavings}
                  data={monthlyData}
                  setPage={setPage}
                  periodLabel={`${months[currentMonth]} ${currentYear}`}
                />
              )}
            </>
          )}
          {period === 'yearly' && (
            <>
              {activeTab === 'balance' && (
                <BalanceTab
                  title={`Transacciones del año ${currentYear}`}
                  totals={yearlyTotals}
                  savings={yearlySavings}
                  data={yearlyData}
                  setPage={setPage}
                  periodLabel={`Año ${currentYear}`}
                />
              )}
              {activeTab === 'income' && (
                <IncomeTab
                  title={`Ingresos del año ${currentYear}`}
                  incomeByType={yearlyIncomeByType}
                  totalIncome={yearlyTotals.income}
                  data={yearlyData}
                  setPage={setPage}
                  periodLabel={`Año ${currentYear}`}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensesTab
                  title={`Gastos del año ${currentYear}`}
                  totals={yearlyTotals}
                  savings={yearlySavings}
                  data={yearlyData}
                  setPage={setPage}
                  periodLabel={`Año ${currentYear}`}
                />
              )}
            </>
          )}
          {period === 'custom' && customStartDate && customEndDate && (
            <>
              {activeTab === 'balance' && (
                <BalanceTab
                  title={`Transacciones del período`}
                  totals={customTotals}
                  savings={customSavings}
                  data={customData}
                  setPage={setPage}
                  periodLabel={`${customStartDate} - ${customEndDate}`}
                />
              )}
              {activeTab === 'income' && (
                <IncomeTab
                  title={`Ingresos del período`}
                  incomeByType={customIncomeByType}
                  totalIncome={customTotals.income}
                  data={customData}
                  setPage={setPage}
                  periodLabel={`${customStartDate} - ${customEndDate}`}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensesTab
                  title={`Gastos del período`}
                  totals={customTotals}
                  savings={customSavings}
                  data={customData}
                  setPage={setPage}
                  periodLabel={`${customStartDate} - ${customEndDate}`}
                />
              )}
            </>
          )}
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
    </div>
  )
}

function PaginatedTable({
  transactions,
  page,
  totalPages,
  onPageChange,
  filterType,
}: {
  transactions: Transaction[]
  page: number
  totalPages: number
  onPageChange: (p: number) => void
  filterType: 'all' | 'income' | 'expense'
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'income') return Number(tx.amount) >= 0
    if (filterType === 'expense') return Number(tx.amount) < 0
    return true
  })

  if (filteredTransactions.length === 0) {
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        No hay transacciones en este período
      </p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-layer-3">
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Fecha</th>
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Descripción</th>
              <th className="text-left py-3 px-2 text-text-secondary font-medium">Categoría</th>
              <th className="text-right py-3 px-2 text-text-secondary font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-layer-2 hover:bg-layer-2/50">
                <td className="py-3 px-2 text-text-secondary">{formatDate(tx.date)}</td>
                <td className="py-3 px-2 text-text-primary font-medium">{tx.description}</td>
                <td className="py-3 px-2">
                  <span
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: tx.category_color ? `${tx.category_color}20` : '#f3f4f6',
                      color: tx.category_color || '#6b7280',
                    }}
                  >
                    {tx.category_name || 'Sin categoría'}
                  </span>
                </td>
                <td
                  className={`py-3 px-2 text-right font-medium ${
                    Number(tx.amount) >= 0 ? 'text-success' : 'text-danger'
                  }`}
                >
                  {Number(tx.amount) >= 0 ? '+' : ''}
                  {formatCurrency(Number(tx.amount))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center gap-2 mt-4">
        <span className="text-xs text-text-secondary">
          Mostrando {filteredTransactions.length} de {transactions.length} transacciones
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-secondary px-2">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  )
}

function BalanceTab({
  title,
  totals,
  savings,
  data,
  setPage,
  periodLabel,
}: {
  title: string
  totals: { income: number; expenses: number }
  savings: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
}) {
  const [showTransactions, setShowTransactions] = useState(false)

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
            <PaginatedTable
              transactions={data.transactions}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              filterType="all"
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
}: {
  title: string
  incomeByType: Record<string, number>
  totalIncome: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
}) {
  const [showTransactions, setShowTransactions] = useState(false)

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
            <PaginatedTable
              transactions={data.transactions}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              filterType="income"
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
}: {
  title: string
  totals: { income: number; expenses: number }
  savings: number
  data: PaginatedTransactions
  setPage: (p: number) => void
  periodLabel: string
}) {
  const [showTransactions, setShowTransactions] = useState(false)

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
            <PaginatedTable
              transactions={data.transactions}
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
              filterType="expense"
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
