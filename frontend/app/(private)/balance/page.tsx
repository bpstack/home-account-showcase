import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BalanceClient from './BalanceClient'
// Helper removed as server-side fetching is removed

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
  const [cookieStore] = await Promise.all([cookies(), searchParams])
  const accessToken = cookieStore.get('accessToken')?.value

  if (!accessToken) {
    redirect('/login')
  }

  // E2E ENCRYPTION: El cliente maneja la carga de datos cifrados
  return <BalanceClient />
}
