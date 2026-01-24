// app/(private)/investment/page.tsx
// Investment module main page

'use client'

import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  InvestmentOverview,
  MarketPricesWidget,
  MarketSummary,
  AIChat
} from '@/components/investment'
import { useAccount } from '@/lib/queries/accounts'
import { useDisclaimersStore } from '@/stores/disclaimersStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { useState, useEffect } from 'react'

// Dynamic imports to avoid SSR issues
const Recommendations = dynamic(
  () => import('@/components/investment/Recommendations').then(mod => mod.Recommendations),
  { ssr: false, loading: () => <SkeletonCard /> }
)

const Simulator = dynamic(
  () => import('@/components/investment/Simulator').then(mod => mod.Simulator),
  { ssr: false, loading: () => <SkeletonCard /> }
)

const ProfileForm = dynamic(
  () => import('@/components/investment/ProfileForm').then(mod => mod.ProfileForm),
  { ssr: false, loading: () => <SkeletonCard /> }
)

export default function InvestmentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')

  const { data: accounts, isLoading: accountsLoading } = useAccount()
  const defaultAccountId = accounts?.defaultAccount?.id

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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Inversión
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Análisis financiero y recomendaciones personalizadas
          </p>
        </div>
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-xl border border-border/50 backdrop-blur-sm">
          <MarketPricesWidget accountId={defaultAccountId} compact />
          <div className="h-8 w-px bg-border/60" />
          <ToggleDisclaimersButton />
        </div>
      </div>

      {/* Main content - Reorganized Layout */}
      <div className="space-y-6">
        {/* Section 1: Resumen de Análisis Financiero + Plan de Inversión */}
        <div className="p-6 rounded-2xl bg-blue-50/30 dark:bg-blue-950/10 border-2 border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Análisis Financiero</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col">
              <InvestmentOverview accountId={defaultAccountId} />
            </div>
            <div className="flex flex-col">
              <Recommendations accountId={defaultAccountId} />
            </div>
          </div>
        </div>

        {/* Section 2: Simulador + Evaluación de Perfil de Riesgo */}
        <div className="p-6 rounded-2xl bg-purple-50/30 dark:bg-purple-950/10 border-2 border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-purple-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-100">Herramientas de Planificación</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            <div className="flex flex-col">
              <Simulator accountId={defaultAccountId} />
            </div>
            <div className="flex flex-col">
              <ProfileForm accountId={defaultAccountId} />
            </div>
          </div>
        </div>

        {/* Section 3: Chat + Mercados */}
        <div className="p-6 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border-2 border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-12 bg-emerald-500 rounded-full"></div>
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Asistente y Mercados</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
            <div className="xl:col-span-2 flex flex-col">
              <AIChat accountId={defaultAccountId} sessionId={sessionId} className="h-[600px] shadow-lg border-border/60 flex-1" />
            </div>
            <div className="xl:col-span-1 flex flex-col">
              <MarketSummary accountId={defaultAccountId} />
            </div>
          </div>
        </div>
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
        className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 transition-colors"
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
