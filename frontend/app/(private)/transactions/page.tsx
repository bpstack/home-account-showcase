import { redirect } from 'next/navigation'
import TransactionsClient from './TransactionsClient'
import { getTransactions } from '@/lib/api'
import { getCategories } from '@/lib/api/categories'
import { createLocalDate, formatLocalDate } from '@/lib/date-utils'
import { getValidAccountId, hasSession } from '@/lib/serverApi'

export default async function TransactionsPage() {
  if (!(await hasSession())) {
    redirect('/login')
  }

  const accountId = await getValidAccountId()

  if (!accountId) {
    return <TransactionsClient />
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const startDate = formatLocalDate(createLocalDate(currentYear, currentMonth, 1))
  const endDate = formatLocalDate(createLocalDate(currentYear, currentMonth + 1, 0))

  const initialData = await Promise.all([
    getTransactions(accountId, {
      startDate,
      endDate,
      limit: 100,
      offset: 0,
    }),
    getCategories(accountId),
  ]).catch((error) => {
    console.error('Error fetching initial data:', error)
    return null
  })

  if (!initialData) {
    return <TransactionsClient />
  }

  const [transactionsResponse, categoriesResponse] = initialData

  return (
    <TransactionsClient
      initialTransactions={transactionsResponse.transactions}
      initialTotal={transactionsResponse.total}
      initialCategories={categoriesResponse.categories}
    />
  )
}
