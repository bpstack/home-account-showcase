'use client'

import { useEffect } from 'react'
import { Button, Money } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useInvestmentOverview, useRecommendations } from '@/lib/queries/investment'
import type { RecommendationItem } from '@/lib/api/investment'
import { AiNote } from './AiNote'

interface RecommendationsProps {
  accountId: string
  /** Average monthly savings: the plan invests a share of it */
  monthlySavings: number
  /** Opens the risk-profile test */
  onTakeTest: () => void
}

const RISK_LABELS: Record<RecommendationItem['risk'], string> = {
  low: 'riesgo bajo',
  medium: 'riesgo medio',
  high: 'riesgo alto',
}

// One accent in four strengths: the split reads as one thing, not as four categories
const ALLOCATION = [
  { key: 'stocks', label: 'Acciones', swatch: 'bg-accent' },
  { key: 'bonds', label: 'Bonos', swatch: 'bg-accent/60' },
  { key: 'crypto', label: 'Cripto', swatch: 'bg-accent/30' },
  { key: 'cash', label: 'Liquidez', swatch: 'bg-text-secondary' },
] as const

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

/** The monthly plan: how much to invest, how it splits and in what. */
export function Recommendations({ accountId, monthlySavings, onTakeTest }: RecommendationsProps) {
  const { data, isLoading, isError, refetch } = useRecommendations(accountId)
  const { data: overview } = useInvestmentOverview(accountId, { refetchOnMount: false })
  const profile = overview?.profile

  // The first request can go out before the profile exists; ask again once it does
  useEffect(() => {
    if (profile && !data) refetch()
  }, [profile, data, refetch])

  const header = (
    <h2 id="investment-plan" className="mb-3 text-sm font-medium text-text-primary">
      Plan del mes
    </h2>
  )

  if (!profile) {
    return (
      <section aria-labelledby="investment-plan">
        {header}
        <EmptyState
          title="Falta tu perfil de inversor"
          description="Con siete preguntas sobre tu edad, tus ingresos y cómo llevas el riesgo, el plan reparte cada mes una parte de lo que ahorras."
          action={
            <Button variant="outline" onClick={onTakeTest}>
              Hacer el test
            </Button>
          }
        />
      </section>
    )
  }

  if (isLoading) {
    return (
      <section aria-labelledby="investment-plan" aria-busy="true">
        {header}
        <div className="space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    )
  }

  if (isError || !data?.assetAllocation) {
    const aiDown = data?.error?.includes('IA no disponible') || data?.error?.includes('rate limit')
    return (
      <section aria-labelledby="investment-plan">
        {header}
        <p className="text-sm text-text-secondary">
          {aiDown
            ? 'La IA no está disponible ahora mismo. Prueba dentro de unos minutos.'
            : 'No se ha podido preparar el plan.'}
        </p>
        <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={() => refetch()}>
          Reintentar
        </Button>
      </section>
    )
  }

  const share = profile.investmentPercentage
  const monthly = (monthlySavings * share) / 100
  const allocation = ALLOCATION.map((part) => ({
    ...part,
    value: Number(data.assetAllocation[part.key]) || 0,
  })).filter((part) => part.value > 0)

  return (
    <section aria-labelledby="investment-plan">
      {header}
      <p className="text-sm text-text-secondary">
        Inviertes{' '}
        <Money value={monthly} tone="neutral" className="text-base font-medium sm:text-xl" /> al
        mes: el {percent.format(share)} % de lo que ahorras.
      </p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-layer-3" aria-hidden="true">
        {allocation.map((part) => (
          <div key={part.key} className={part.swatch} style={{ width: `${part.value}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        {allocation.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${part.swatch}`} />
            {part.label} {percent.format(part.value)} %
          </li>
        ))}
      </ul>

      <ul className="mt-4 divide-y divide-layer-3 border-y border-layer-3">
        {data.recommendations.map((rec) => (
          <li key={`${rec.type}-${rec.symbol}`} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">
                {rec.name} <span className="text-xs text-text-secondary">{rec.symbol}</span>
              </p>
              <p className="truncate text-xs text-text-secondary" title={rec.reason}>
                {RISK_LABELS[rec.risk] ?? rec.risk} · {rec.reason}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Money
                value={(monthly * rec.percentage) / 100}
                tone="neutral"
                className="text-sm font-medium"
              />
              <p className="text-xs tabular-nums text-text-secondary">
                {percent.format(rec.percentage)} %
              </p>
            </div>
          </li>
        ))}
      </ul>

      {data.marketContext && (
        <p className="mt-3 text-sm text-text-secondary">{data.marketContext}</p>
      )}
      <AiNote className="mt-3" />
    </section>
  )
}
