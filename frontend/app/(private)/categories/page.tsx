import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'
import { getCategories } from '@/lib/api'
import { getValidAccountId } from '@/lib/serverApi'

export default async function CategoriesPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
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
