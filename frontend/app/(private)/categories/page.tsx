import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'
import { getCategories } from '@/lib/api'

export default async function CategoriesPage() {
  const cookieStore = await cookies()
  const accountId = cookieStore.get('selectedAccountId')?.value
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    redirect('/login')
  }

  if (!accountId) {
    return <CategoriesClient initialCategories={[]} />
  }

  try {
    const categoriesResponse = await getCategories(accountId)
    return <CategoriesClient initialCategories={categoriesResponse.categories} />
  } catch (error) {
    console.error('Error fetching categories:', error)
    return <CategoriesClient initialCategories={[]} />
  }
}
