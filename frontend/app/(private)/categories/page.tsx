import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'
import { getCategories } from '@/lib/api'
import { getValidAccountId, hasSession } from '@/lib/serverApi'

export default async function CategoriesPage() {
  if (!(await hasSession())) {
    redirect('/login')
  }

  const accountId = await getValidAccountId()

  if (!accountId) {
    return <CategoriesClient initialCategories={[]} />
  }

  const categoriesResponse = await getCategories(accountId).catch((error) => {
    console.error('Error fetching categories:', error)
    return null
  })

  return (
    <CategoriesClient initialCategories={categoriesResponse ? categoriesResponse.categories : []} />
  )
}
