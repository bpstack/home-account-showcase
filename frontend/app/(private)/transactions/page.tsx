import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import TransactionsClient from './TransactionsClient'
import { getTransactions } from '@/lib/api'
import { getCategories } from '@/lib/api/categories'

export default async function TransactionsPage() {
  const cookieStore = await cookies()
  const accountId = cookieStore.get('selectedAccountId')?.value
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    redirect('/login')
  }

  if (!accountId) {
    return <TransactionsClient />
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
  const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]

  try {
    const [transactionsResponse, categoriesResponse] = await Promise.all([
      getTransactions(accountId, {
        startDate,
        endDate,
        limit: 100,
        offset: 0,
      }),
      getCategories(accountId),
    ])

    return (
      <TransactionsClient
        initialTransactions={transactionsResponse.transactions}
        initialTotal={transactionsResponse.total}
        initialCategories={categoriesResponse.categories}
      />
    )
  } catch (error) {
    console.error('Error fetching initial data:', error)
    return <TransactionsClient />
  }
}
