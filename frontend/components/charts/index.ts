// components/charts/index.ts - Dynamic imports para Recharts (~300KB)
import dynamic from 'next/dynamic'

// Skeleton para charts mientras cargan
function ChartSkeleton() {
  return null // El skeleton se renderiza en el Suspense boundary del componente padre
}

// Exports con lazy loading - ssr: false porque Recharts usa window
export const CategoryPieChart = dynamic(
  () => import('./CategoryPieChart').then((m) => m.CategoryPieChart),
  { ssr: false, loading: ChartSkeleton }
)

export const MonthlyBarChart = dynamic(
  () => import('./MonthlyBarChart').then((m) => m.MonthlyBarChart),
  { ssr: false, loading: ChartSkeleton }
)

export const BalanceLineChart = dynamic(
  () => import('./BalanceLineChart').then((m) => m.BalanceLineChart),
  { ssr: false, loading: ChartSkeleton }
)
