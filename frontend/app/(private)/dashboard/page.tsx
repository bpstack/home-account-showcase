import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
type Period = 'month' | 'year' | 'all'

interface DashboardPageProps {
  searchParams: Promise<{
    tab?: string
    period?: Period
    year?: string
    month?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function DashboardPage({ searchParams: _searchParams }: DashboardPageProps) {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  // Si no hay token, el middleware ya redirige, pero verificamos por si acaso
  if (!accessToken) {
    redirect('/login')
  }

  // E2E ENCRYPTION: No hacer fetch de datos cifrados en Server Component
  // El DashboardClient usa hooks que descifran correctamente en el cliente
  // Los datos se cargarán client-side con loading states/skeletons

  return <DashboardClient initialData={{}} />
}
