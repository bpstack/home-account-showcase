// app/(private)/investment/page.tsx
// Investment module main page - Redesigned for better mobile/desktop UX

'use client'

import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  InvestmentOverview,
  MarketPricesWidget,
  MarketSummary,
  AIChat,
} from '@/components/investment'
import { useAccount } from '@/lib/queries/accounts'
import { useInvestmentOverview } from '@/lib/queries/investment'
import { useDisclaimersStore } from '@/stores/disclaimersStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useState, useEffect, useCallback } from 'react'
import { useMarketPrices } from '@/lib/queries/investment'
import { useFinancialMetrics } from '@/hooks/useFinancialMetrics'

// Dynamic imports to avoid SSR issues
const Recommendations = dynamic(
  () => import('@/components/investment/Recommendations').then((mod) => mod.Recommendations),
  { ssr: false, loading: () => <SkeletonCard /> }
)

const Simulator = dynamic(
  () => import('@/components/investment/Simulator').then((mod) => mod.Simulator),
  { ssr: false, loading: () => <SkeletonCard /> }
)

const ProfileForm = dynamic(
  () => import('@/components/investment/ProfileForm').then((mod) => mod.ProfileForm),
  { ssr: false, loading: () => <SkeletonCard /> }
)

export default function InvestmentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')

  const { data: accounts, isLoading: accountsLoading } = useAccount()
  const defaultAccountId = accounts?.defaultAccount?.id
  const { data: overviewData } = useInvestmentOverview(defaultAccountId ?? '', {
    refetchOnMount: false,
  })
  const riskProfile = overviewData?.profile?.riskProfile as
    | 'conservative'
    | 'balanced'
    | 'dynamic'
    | undefined

  // Filter state — lifted here so InvestmentOverview and Recommendations stay in sync
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth())
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear())

  const handleFilterChange = useCallback((month: number, year: number) => {
    setFilterMonth(month)
    setFilterYear(year)
  }, [])

  // Get financial metrics for selected month savings
  const { metrics: financialSummary } = useFinancialMetrics(defaultAccountId ?? '')
  const selectedPeriodKey = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`
  const selectedMonthSavings = financialSummary?.monthlyBreakdown?.[selectedPeriodKey]?.savings

  useEffect(() => {
    if (!accountsLoading && !defaultAccountId) {
      return
    }

    if (sessionId && defaultAccountId) {
      const url = new URL(window.location.href)
      url.searchParams.delete('sessionId')
      router.replace(url.pathname + url.search)
    }
  }, [accountsLoading, defaultAccountId, sessionId, router])

  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!defaultAccountId) {
    return <NoAccountsState />
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-1 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-6 lg:py-8 space-y-3 sm:space-y-4 lg:space-y-8">
      {/* Header - Responsive redesign */}
      <header className="space-y-4">
        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Inversión
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base lg:text-lg line-clamp-2">
              Análisis financiero y recomendaciones personalizadas
            </p>
          </div>

          {/* Desktop controls */}
          <div className="hidden md:flex items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/50 backdrop-blur-sm shrink-0">
            <MarketPricesWidget accountId={defaultAccountId} compact />
            <div className="h-8 w-px bg-border/60" />
            <ToggleDisclaimersButton />
          </div>
        </div>

        {/* Mobile market data + controls - full width card */}
        <div className="md:hidden">
          <MobileMarketHeader accountId={defaultAccountId} />
        </div>
      </header>

      {/* Main content - Reorganized Layout */}
      <div className="space-y-4 sm:space-y-6">
        {/* Section 1: Análisis Financiero */}
        <section className="p-1.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-2xl bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-4 px-1 sm:px-0">
            <div className="hidden sm:block h-1 w-12 bg-blue-500 rounded-full"></div>
            <h2 className="text-xs sm:text-lg font-semibold text-blue-900 dark:text-blue-100">
              Análisis Financiero
            </h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-6 items-stretch">
            <div className="flex flex-col min-w-0">
              <InvestmentOverview
                accountId={defaultAccountId}
                filterMonth={filterMonth}
                filterYear={filterYear}
                onFilterChange={handleFilterChange}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <Recommendations
                accountId={defaultAccountId}
                selectedMonthSavings={selectedMonthSavings}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Herramientas de Planificación */}
        <section
          id="herramientas"
          className="p-1.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-2xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 scroll-mt-4"
        >
          <div className="flex items-center gap-2 mb-1.5 sm:mb-4 px-1 sm:px-0">
            <div className="hidden sm:block h-1 w-12 bg-purple-500 rounded-full"></div>
            <h2 className="text-xs sm:text-lg font-semibold text-purple-900 dark:text-purple-100">
              Herramientas de Planificación
            </h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-6 items-stretch">
            <div className="flex flex-col min-w-0">
              <Simulator accountId={defaultAccountId} riskProfile={riskProfile} />
            </div>
            <div id="perfil-form" className="flex flex-col min-w-0 scroll-mt-4">
              <ProfileForm
                accountId={defaultAccountId}
                selectedMonthSavings={selectedMonthSavings}
              />
            </div>
          </div>
        </section>

        {/* Section 3: Chat + Mercados */}
        <section className="p-1.5 sm:p-4 lg:p-6 rounded-lg sm:rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 mb-1.5 sm:mb-4 px-1 sm:px-0">
            <div className="hidden sm:block h-1 w-12 bg-emerald-500 rounded-full"></div>
            <h2 className="text-xs sm:text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              Asistente y Mercados
            </h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-6 items-stretch">
            <div className="xl:col-span-2 flex flex-col min-w-0">
              <AIChat
                accountId={defaultAccountId}
                sessionId={sessionId}
                className="h-[400px] sm:h-[500px] lg:h-[600px] shadow-lg border-border/60 flex-1"
              />
            </div>
            <div className="xl:col-span-1 flex flex-col min-w-0">
              <MarketSummary accountId={defaultAccountId} />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ========================
// Helper Components
// ========================

function NoAccountsState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2">Sin cuenta seleccionada</h2>
      <p className="text-muted-foreground max-w-md">
        Selecciona una cuenta desde el dashboard para acceder al módulo de inversión.
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function ToggleDisclaimersButton() {
  const store = useDisclaimersStore()
  const [showTooltip, setShowTooltip] = useState(false)
  const isVisible = store.showRecommendations || store.showChat

  return (
    <div className="relative">
      <button
        onClick={store.toggle}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors p-2"
      >
        {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      {showTooltip && (
        <div className="absolute right-0 top-full mt-1 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md whitespace-nowrap z-10">
          {isVisible ? 'Ocultar avisos' : 'Mostrar avisos'}
        </div>
      )}
    </div>
  )
}

// Mobile-optimized market header component
function MobileMarketHeader({ accountId }: { accountId: string }) {
  const { data, isLoading, isFetching, refetch } = useMarketPrices(accountId)
  const store = useDisclaimersStore()
  const isVisible = store.showRecommendations || store.showChat

  const sp500 = data?.indices?.find((i: any) => i.symbol === 'SP500')
  const btc = data?.cryptocurrencies?.find((c: any) => c.symbol === 'bitcoin')

  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-muted/30 rounded-xl border border-border/50">
      {/* Market data - wrapping properly */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        {isLoading ? (
          <>
            <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
            <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
          </>
        ) : (
          <>
            {sp500 && (
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-full border border-border/50 text-xs">
                <span className="text-muted-foreground font-medium">S&P</span>
                <span className="font-mono font-semibold">
                  {sp500.value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
                </span>
                <span
                  className={
                    sp500.change24h >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {sp500.change24h >= 0 ? '+' : ''}
                  {sp500.change24h?.toFixed(1)}%
                </span>
              </div>
            )}
            {btc && (
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-full border border-border/50 text-xs">
                <span className="text-amber-500">₿</span>
                <span className="font-mono font-semibold">€{(btc.price / 1000).toFixed(0)}K</span>
                <span
                  className={
                    btc.change24h >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {btc.change24h >= 0 ? '+' : ''}
                  {btc.change24h?.toFixed(1)}%
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-lg hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={store.toggle}
          className="p-2 rounded-lg hover:bg-background/50 text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
