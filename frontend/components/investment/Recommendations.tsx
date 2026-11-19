'use client'

import { Button, Money } from '@/components/ui'
import { EmptyState } from '@/components/ui/EmptyState'
import { useInvestmentOverview } from '@/lib/queries/investment'
import { buildMonthlyPlan, type AssetClass, type PlanItem } from '@/lib/investment-plan'

interface RecommendationsProps {
  accountId: string
  /** Average monthly savings: the plan invests a share of it */
  monthlySavings: number
  /** Opens the risk-profile test */
  onTakeTest: () => void
}

const RISK_LABELS: Record<PlanItem['risk'], string> = {
  low: 'riesgo bajo',
  medium: 'riesgo medio',
  high: 'riesgo alto',
}

// One accent in three strengths: the split reads as one thing, not as three categories
const ALLOCATION: Array<{ key: AssetClass; label: string; swatch: string }> = [
  { key: 'stocks', label: 'Acciones', swatch: 'bg-accent' },
  { key: 'bonds', label: 'Bonos', swatch: 'bg-accent/50' },
  { key: 'cash', label: 'Liquidez', swatch: 'bg-text-secondary' },
]

const percent = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 })

/** The monthly plan, by fixed rules: how much to invest, how it splits and in what. */
export function Recommendations({ accountId, monthlySavings, onTakeTest }: RecommendationsProps) {
  const { data: overview } = useInvestmentOverview(accountId, { refetchOnMount: false })
  const profile = overview?.profile
  const share = profile?.investmentPercentage ?? 0
  const monthly = (monthlySavings * share) / 100

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

  if (monthly <= 0) {
    return (
      <section aria-labelledby="investment-plan">
        {header}
        <p className="text-sm text-text-secondary">
          {share === 0
            ? 'De momento no inviertes: hasta tener un fondo de emergencia de 3 meses de gastos, todo tu ahorro va a él.'
            : 'Este mes no hay ahorro que invertir: el plan se prepara cuando ingreses más de lo que gastas.'}
        </p>
      </section>
    )
  }

  const plan = buildMonthlyPlan(profile.riskProfile, monthly)
  const allocation = ALLOCATION.filter((part) => plan.allocation[part.key] > 0)

  return (
    <section aria-labelledby="investment-plan">
      {header}
      <p className="text-sm text-text-secondary">
        Inviertes{' '}
        <Money value={plan.total} tone="neutral" className="text-base font-medium sm:text-xl" /> al
        mes: el {percent.format(share)} % de lo que ahorras.
      </p>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-layer-3" aria-hidden="true">
        {allocation.map((part) => (
          <div
            key={part.key}
            className={part.swatch}
            style={{ width: `${plan.allocation[part.key]}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        {allocation.map((part) => (
          <li key={part.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${part.swatch}`} />
            {part.label} {percent.format(plan.allocation[part.key])} %
          </li>
        ))}
      </ul>

      <ul className="mt-4 divide-y divide-layer-3 border-y border-layer-3">
        {plan.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary">
                {item.isin && <span className="tabular-nums">{item.isin} · </span>}
                {RISK_LABELS[item.risk]} · {item.reason}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <Money value={item.amount} tone="neutral" className="text-sm font-medium" />
              <p className="text-xs tabular-nums text-text-secondary">
                {percent.format(item.percentage)} %
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-text-secondary">
        Reparto orientativo con reglas fijas según tu perfil. Los fondos son ejemplos UCITS:
        comprueba en tu bróker que estén disponibles y sus comisiones. No es asesoramiento
        financiero.
      </p>
    </section>
  )
}
