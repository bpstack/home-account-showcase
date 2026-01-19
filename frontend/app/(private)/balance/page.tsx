import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BalanceClient from './BalanceClient'
import { getTransactionStats, getTransactions, getTransactionSummary } from '@/lib/api'

interface PeriodStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
  incomeByType: Record<string, number>
}

type Period = 'monthly' | 'yearly' | 'custom'

function getDateRange(
  period: Period,
  month: number,
  year: number,
  customStart?: string,
  customEnd?: string
) {
  switch (period) {
    case 'yearly':
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      }
    case 'custom':
      return {
        startDate: customStart || '',
        endDate: customEnd || '',
      }
    default: // monthly
      return {
        startDate: new Date(year, month, 1).toISOString().split('T')[0],
        endDate: new Date(year, month + 1, 0).toISOString().split('T')[0],
      }
  }
}

function processSummaryIntoCategories(summary: any[]) {
  const expenseMap = new Map<string, { color: string; amount: number }>()
  const incomeMap = new Map<string, { color: string; amount: number }>()

  summary.forEach((item) => {
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

  return { expenses: sortedExpenses, income: sortedIncome }
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    period?: string
    month?: string
    year?: string
    start?: string
    end?: string
  }>
}) {
  const [cookieStore, params] = await Promise.all([cookies(), searchParams])
  const accountId = cookieStore.get('selectedAccountId')?.value
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    redirect('/login')
  }

  if (!accountId) {
    return <BalanceClient />
  }

  const now = new Date()
  const period = (params.period as Period) || 'monthly'
  const month = params.month !== undefined ? parseInt(params.month, 10) : now.getMonth()
  const year = params.year !== undefined ? parseInt(params.year, 10) : now.getFullYear()

  const { startDate, endDate } = getDateRange(period, month, year, params.start, params.end)

  try {
    const [statsResponse, transactionsResponse, summaryResponse] = await Promise.all([
      getTransactionStats(accountId, startDate, endDate),
      getTransactions(accountId, { startDate, endDate, limit: 50, offset: 0 }),
      getTransactionSummary(accountId, startDate, endDate),
    ])

    const { expenses: expensesByCategory, income: incomeByCategory } = processSummaryIntoCategories(
      summaryResponse.summary || []
    )

    const initialStats: PeriodStats = statsResponse.stats || {
      income: 0,
      expenses: 0,
      balance: 0,
      transactionCount: 0,
      incomeByType: {},
    }

    return (
      <BalanceClient
        initialStats={initialStats}
        initialTransactions={transactionsResponse.transactions}
        initialTotal={transactionsResponse.total}
        initialExpensesByCategory={expensesByCategory}
        initialIncomeByCategory={incomeByCategory}
      />
    )
  } catch (error) {
    console.error('Error fetching initial data:', error)
    return <BalanceClient />
  }
}
