import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient, { type DashboardInitialData } from './DashboardClient'
import {
  getTransactionStats,
  getTransactionSummary,
  getMonthlySummary,
  getBalanceHistory,
} from '@/lib/api'

type Period = 'month' | 'year' | 'all'

interface DashboardPageProps {
  searchParams: Promise<{
    tab?: string
    period?: Period
    year?: string
  }>
}

function getDateRange(period: Period, selectedYear: number) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

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
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const cookieStore = await cookies()
  const accountId = cookieStore.get('selectedAccountId')?.value
  const accessToken = cookieStore.get('accessToken')?.value

  // Si no hay token, el middleware ya redirige, pero verificamos por si acaso
  if (!accessToken) {
    redirect('/login')
  }

  // Si no hay cuenta seleccionada, no podemos hacer fetch
  // El cliente manejará este caso
  if (!accountId) {
    return <DashboardClient initialData={{}} />
  }

  const params = await searchParams
  const activeTab = params.tab || 'overview'
  const period = (params.period as Period) || 'month'
  const selectedYear = parseInt(params.year || String(new Date().getFullYear()), 10)

  const { startDate, endDate } = getDateRange(period, selectedYear)

  // Fetch inicial basado en el tab activo
  const initialData: DashboardInitialData = {}

  try {
    if (activeTab === 'overview' || activeTab === 'stats' || activeTab === 'savings') {
      // Para estos tabs necesitamos stats y summary
      const [statsResult, summaryResult] = await Promise.all([
        getTransactionStats(accountId, startDate, endDate),
        getTransactionSummary(accountId, startDate, endDate),
      ])
      initialData.stats = statsResult
      initialData.summary = summaryResult
    } else if (activeTab === 'history') {
      // Para history necesitamos monthly summary y balance history
      const [monthlySummaryResult, balanceHistoryResult] = await Promise.all([
        getMonthlySummary(accountId, selectedYear),
        getBalanceHistory(accountId, selectedYear),
      ])
      initialData.monthlySummary = monthlySummaryResult
      initialData.balanceHistory = balanceHistoryResult
    }
  } catch (error) {
    // Si hay error en el fetch (ej: token expirado), dejamos que el cliente maneje
    console.error('Error fetching initial data:', error)
  }

  return <DashboardClient initialData={initialData} />
}
